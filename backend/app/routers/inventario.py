from __future__ import annotations
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from pydantic import BaseModel, ConfigDict
from pathlib import Path as FsPath
import re
import shutil
from ..deps import get_current_user, get_tenant_filter
from ..models import inventario as inv_model
from ..models import audit as audit_model
from ..models import notificaciones as noti_model
from ..realtime.ws_manager import manager
import datetime as dt

router = APIRouter(prefix="/inventario", tags=["inventario"])

UPLOADS_EQUIPO = FsPath("uploads/equipo")
INVENTARIO_MODULO = 6
TIPO_CREACION = 1
TIPO_ACTUALIZACION = 2
TIPO_ELIMINACION = 3


def _log_audit_equipo(action: str, message: str, id_equipo: int, user_id: int, changes=None):
    try:
        audit_model.create_audit_log(data={
            "action": action,
            "message": message,
            "id_user": user_id,
            "id_modulo": INVENTARIO_MODULO,
            "id_key": str(id_equipo),
            "changes": changes,
        })
    except Exception:
        pass


async def _notify_equipo(tipo: int, descripcion: str, id_equipo: int, user_id: int, id_cliente: Optional[int] = None):
    try:
        _data = {
            "id_tipo_notificacion": tipo,
            "id_modulo": INVENTARIO_MODULO,
            "descripcion": descripcion,
            "id_user": user_id,
            "urgente": 0,
            "id_key": str(id_equipo),
        }
        if id_cliente:
            _data["id_cliente"] = id_cliente
        noti_model.create_notificacion(data=_data)
    except Exception:
        pass
    await manager.broadcast_json({
        "type": "NOTIFICACION_INVALIDATE",
        "source": "inventario",
        "id_equipo": id_equipo,
        "descripcion_notificacion": descripcion,
        "id_user": user_id,
    })


# ================== CONFIG: ESTADOS ==================

class EstadoCreate(BaseModel):
    nombre: str
    model_config = ConfigDict(extra="ignore")


@router.get("/config/estados")
def list_estados(
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    from ..db import get_connection
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id_inventario_estado, nombre FROM inventario_estados WHERE active = 1 ORDER BY nombre ASC"
            )
            return cur.fetchall() or []
    finally:
        conn.close()


@router.post("/config/estados", status_code=201)
def create_estado(
    payload: EstadoCreate,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    from ..db import get_connection
    nombre = (payload.nombre or "").strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="Nombre requerido")
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id_inventario_estado FROM inventario_estados WHERE nombre = %s AND active = 1 LIMIT 1",
                (nombre,),
            )
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="Ya existe un estado con ese nombre")
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO inventario_estados (nombre, active) VALUES (%s, 1)",
                (nombre,),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id_inventario_estado": new_id, "nombre": nombre}
    finally:
        conn.close()


@router.delete("/config/estados/{id_estado}", status_code=200)
def delete_estado(
    id_estado: int,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    from ..db import get_connection
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE inventario_estados SET active = 0 WHERE id_inventario_estado = %s AND active = 1",
                (id_estado,),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Estado no encontrado")
        conn.commit()
    finally:
        conn.close()
    return {"deleted": 1, "id_inventario_estado": id_estado}


# ================== CONFIG: ALERTAS ==================

_CFG_INV_DDL = """
CREATE TABLE IF NOT EXISTS configuracion_inventario (
    id_configuracion_inventario INT AUTO_INCREMENT PRIMARY KEY,
    stock_minimo                INT          NOT NULL DEFAULT 0,
    correo_stock_minimo         TINYINT(1)   NOT NULL DEFAULT 0,
    correo_movimiento           TINYINT(1)   NOT NULL DEFAULT 0,
    id_user                     INT          NOT NULL DEFAULT 0,
    active                      TINYINT(1)   NOT NULL DEFAULT 1,
    datetime                    DATETIME     NOT NULL
)
"""

def _ensure_cfg_inventario(conn):
    with conn.cursor() as cur:
        cur.execute(_CFG_INV_DDL)
    conn.commit()


_ALERTAS_DEFAULTS = {
    "stock_minimo": 0,
    "correo_stock_minimo": False,
    "correo_movimiento": False,
}


@router.get("/config/alertas")
def get_config_alertas(
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    from ..db import get_connection
    conn = get_connection()
    try:
        _ensure_cfg_inventario(conn)
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT stock_minimo, correo_stock_minimo, correo_movimiento
                FROM configuracion_inventario
                WHERE active = 1
                ORDER BY id_configuracion_inventario DESC
                LIMIT 1
                """
            )
            row = cur.fetchone()
        if not row:
            return _ALERTAS_DEFAULTS.copy()
        return {
            "stock_minimo": int(row["stock_minimo"]),
            "correo_stock_minimo": bool(row["correo_stock_minimo"]),
            "correo_movimiento": bool(row["correo_movimiento"]),
        }
    finally:
        conn.close()


class ConfigAlertasInv(BaseModel):
    stock_minimo: int = 0
    correo_stock_minimo: bool = False
    correo_movimiento: bool = False
    model_config = ConfigDict(extra="ignore")


@router.put("/config/alertas", status_code=200)
def save_config_alertas(
    payload: ConfigAlertasInv,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    from ..db import get_connection
    user_id = int(_cu.get("id") or _cu.get("id_user") or 0)
    now = dt.datetime.now()
    conn = get_connection()
    try:
        _ensure_cfg_inventario(conn)
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT id_configuracion_inventario
                FROM configuracion_inventario
                WHERE active = 1
                ORDER BY id_configuracion_inventario DESC
                LIMIT 1
                """
            )
            existing = cur.fetchone()

        if existing:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE configuracion_inventario SET
                        stock_minimo        = %s,
                        correo_stock_minimo = %s,
                        correo_movimiento   = %s,
                        datetime            = %s
                    WHERE id_configuracion_inventario = %s
                    """,
                    (
                        payload.stock_minimo,
                        int(payload.correo_stock_minimo),
                        int(payload.correo_movimiento),
                        now,
                        existing["id_configuracion_inventario"],
                    ),
                )
        else:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO configuracion_inventario
                        (stock_minimo, correo_stock_minimo, correo_movimiento, id_user, active, datetime)
                    VALUES (%s, %s, %s, %s, 1, %s)
                    """,
                    (
                        payload.stock_minimo,
                        int(payload.correo_stock_minimo),
                        int(payload.correo_movimiento),
                        user_id,
                        now,
                    ),
                )
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}


# ================== SCHEMAS ==================

class CategoriaCreate(BaseModel):
    nombre: str
    model_config = ConfigDict(extra="ignore")


class CategoriaUpdate(BaseModel):
    nombre: Optional[str] = None
    model_config = ConfigDict(extra="ignore")


class EquipoCreate(BaseModel):
    nombre: str
    id_categoria_equipo: int
    descripcion: Optional[str] = None
    estado: Optional[str] = "activo"
    model_config = ConfigDict(extra="ignore")


class EquipoUpdate(BaseModel):
    nombre: Optional[str] = None
    id_categoria_equipo: Optional[int] = None
    descripcion: Optional[str] = None
    estado: Optional[str] = None
    active: Optional[int] = None
    model_config = ConfigDict(extra="ignore")


class MovimientoCreate(BaseModel):
    tipo: str
    cantidad: int
    motivo: str
    fecha_movimiento: Optional[str] = None
    descripcion: Optional[str] = None
    model_config = ConfigDict(extra="ignore")


class ConteoCreate(BaseModel):
    fecha: Optional[str] = None
    tipo: Optional[str] = "mensual"
    descripcion: Optional[str] = None
    model_config = ConfigDict(extra="ignore")


class DetalleUpdate(BaseModel):
    cantidad_fisica: int
    descripcion: Optional[str] = None
    model_config = ConfigDict(extra="ignore")


# ================== CATEGORIAS ==================

@router.get("/categorias")
def get_categorias(
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    return inv_model.list_categorias(id_cliente=tenant_id)


@router.post("/categorias", status_code=201)
def crear_categoria(
    payload: CategoriaCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")
    return inv_model.create_categoria(payload.model_dump(), int(user_id), id_cliente=tenant_id)


@router.patch("/categorias/{id_categoria}")
def actualizar_categoria(
    id_categoria: int,
    payload: CategoriaUpdate,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    affected = inv_model.update_categoria(id_categoria, data)
    if not affected:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return {"updated": 1}


@router.delete("/categorias/{id_categoria}")
def eliminar_categoria(
    id_categoria: int,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    affected = inv_model.delete_categoria(id_categoria)
    if not affected:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return {"deleted": 1}


# ================== EQUIPO ==================

@router.get("/equipo")
def get_equipo(
    search: Optional[str] = Query(None),
    id_categoria: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    return inv_model.list_equipo(search=search, id_categoria=id_categoria, estado=estado, id_cliente=tenant_id)


@router.post("/equipo", status_code=201)
async def crear_equipo(
    payload: EquipoCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")
    result = inv_model.create_equipo(payload.model_dump(), int(user_id), id_cliente=tenant_id)
    new_id = result["id_equipo"]
    nombre = payload.model_dump().get("nombre") or f"#{new_id}"
    _log_audit_equipo("CREATE", f"Equipo '{nombre}' registrado en inventario", new_id, int(user_id))
    await _notify_equipo(TIPO_CREACION, f"Nuevo equipo '{nombre}' registrado en inventario", new_id, int(user_id), id_cliente=tenant_id)
    item = inv_model.get_equipo_by_id(new_id)
    return {"id_equipo": new_id, "item": item}


@router.get("/equipo/{id_equipo}")
def get_equipo_detail(
    id_equipo: int,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = inv_model.get_equipo_by_id(id_equipo)
    if not row:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return row


@router.patch("/equipo/{id_equipo}")
async def actualizar_equipo(
    id_equipo: int,
    payload: EquipoUpdate,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = inv_model.get_equipo_by_id(id_equipo)
    if not row:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    inv_model.update_equipo(id_equipo, data)
    nombre = row.get("nombre") or f"#{id_equipo}"
    _log_audit_equipo("UPDATE", f"Equipo '{nombre}' actualizado", id_equipo, _cu.get("id", 0), changes=data)
    await _notify_equipo(TIPO_ACTUALIZACION, f"Equipo '{nombre}' actualizado en inventario", id_equipo, _cu.get("id", 0), id_cliente=row.get("id_cliente"))
    item = inv_model.get_equipo_by_id(id_equipo)
    return {"updated": 1, "item": item}


@router.post("/equipo/{id_equipo}/imagen", status_code=200)
async def subir_imagen_equipo(
    id_equipo: int,
    file: UploadFile = File(...),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = inv_model.get_equipo_by_id(id_equipo)
    if not row:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    dest_dir = UPLOADS_EQUIPO / str(id_equipo)
    dest_dir.mkdir(parents=True, exist_ok=True)

    original_filename = file.filename
    safe_name = re.sub(r"[^\w.\-]", "_", original_filename)
    timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    stored_name = f"{timestamp}_{safe_name}"
    dest_path = dest_dir / stored_name

    with dest_path.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)

    from ..utils.comprimir import compress_file_best_effort
    dest_path = compress_file_best_effort(dest_path, max_image_dimension=1920)
    rel_path = str(dest_path).replace("\\", "/")
    inv_model.update_equipo_imagen(id_equipo, original_filename, rel_path)

    return {"filename": original_filename, "path": rel_path}


@router.get("/equipo/{id_equipo}/analisis")
def get_analisis_equipo(
    id_equipo: int,
    date_from: str = Query(...),
    date_to: str = Query(...),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = inv_model.get_equipo_by_id(id_equipo)
    if not row:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return inv_model.get_equipo_analisis(id_equipo, date_from, date_to)


@router.delete("/equipo/{id_equipo}")
def eliminar_equipo(
    id_equipo: int,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = inv_model.get_equipo_by_id(id_equipo)
    if not row:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    inv_model.delete_equipo(id_equipo)
    _log_audit_equipo("DELETE", f"Equipo #{id_equipo} eliminado del inventario", id_equipo, _cu.get("id", 0))
    return {"deleted": 1, "id_equipo": id_equipo}


@router.get("/equipo/{id_equipo}/actividad")
def get_actividad_equipo(
    id_equipo: int,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    items, total = audit_model.list_audit_logs(
        filters={"id_modulo": INVENTARIO_MODULO, "id_key": str(id_equipo)},
        limit=limit,
        offset=offset,
    )
    return {"items": items, "total": total}


# ================== MOVIMIENTOS ==================

@router.get("/equipo/{id_equipo}/movimientos")
def get_movimientos(
    id_equipo: int,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = inv_model.get_equipo_by_id(id_equipo)
    if not row:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return inv_model.list_movimientos(id_equipo)


@router.post("/equipo/{id_equipo}/movimientos", status_code=201)
def crear_movimiento(
    id_equipo: int,
    payload: MovimientoCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")
    row = inv_model.get_equipo_by_id(id_equipo)
    if not row:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    data = payload.model_dump()
    if data.get("fecha_movimiento"):
        try:
            data["fecha_movimiento"] = dt.datetime.fromisoformat(data["fecha_movimiento"].replace("Z", "+00:00"))
        except Exception:
            raise HTTPException(status_code=400, detail="Fecha inválida")
    else:
        data["fecha_movimiento"] = dt.datetime.now()

    result = inv_model.create_movimiento(id_equipo, data, int(user_id))
    return result


@router.delete("/equipo/{id_equipo}/movimientos/{id_movimiento}")
def eliminar_movimiento(
    id_equipo: int,
    id_movimiento: int,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    affected = inv_model.delete_movimiento(id_movimiento)
    if not affected:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    return {"deleted": 1}


# ================== CONTEOS ==================

@router.get("/conteos")
def get_conteos(
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    return inv_model.list_conteos()


@router.post("/conteos", status_code=201)
def crear_conteo(
    payload: ConteoCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")
    data = payload.model_dump()
    if data.get("fecha"):
        try:
            data["fecha"] = dt.date.fromisoformat(data["fecha"])
        except Exception:
            raise HTTPException(status_code=400, detail="Fecha inválida")
    result = inv_model.create_conteo(data, int(user_id))
    conteo = inv_model.get_conteo_by_id(result["id_inventario_conteo"])
    return conteo


@router.get("/conteos/{id_conteo}")
def get_conteo(
    id_conteo: int,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    conteo = inv_model.get_conteo_by_id(id_conteo)
    if not conteo:
        raise HTTPException(status_code=404, detail="Conteo no encontrado")
    return conteo


@router.patch("/conteos/{id_conteo}/detalles/{id_detalle}")
def actualizar_detalle(
    id_conteo: int,
    id_detalle: int,
    payload: DetalleUpdate,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    affected = inv_model.update_detalle_fisica(
        id_detalle,
        payload.cantidad_fisica,
        payload.descripcion,
    )
    if not affected:
        raise HTTPException(status_code=404, detail="Detalle no encontrado")
    return {"updated": 1}


@router.delete("/conteos/{id_conteo}")
def eliminar_conteo(
    id_conteo: int,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    conteo = inv_model.get_conteo_by_id(id_conteo)
    if not conteo:
        raise HTTPException(status_code=404, detail="Conteo no encontrado")
    inv_model.delete_conteo(id_conteo)
    return {"deleted": 1}
