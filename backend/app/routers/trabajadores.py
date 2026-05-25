from __future__ import annotations
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel, ConfigDict
from pathlib import Path as FsPath
import re
import datetime as dt
import shutil
from ..deps import get_current_user, get_tenant_filter
from ..models import trabajadores as trab_model
from ..models import audit as audit_model
from ..models import notificaciones as noti_model
from ..realtime.ws_manager import manager

TRABAJADOR_MODULO = 5
TIPO_CREACION = 1
TIPO_ACTUALIZACION = 2
TIPO_ELIMINACION = 3

router = APIRouter(prefix="/trabajadores", tags=["trabajadores"])


def _log_audit_trabajador(action: str, message: str, id_trabajador: int, user_id: int, changes=None):
    try:
        audit_model.create_audit_log(data={
            "action": action,
            "message": message,
            "id_user": user_id,
            "id_modulo": TRABAJADOR_MODULO,
            "id_key": str(id_trabajador),
            "changes": changes,
        })
    except Exception:
        pass


async def _notify_trabajador(tipo: int, descripcion: str, id_trabajador: int, user_id: int, id_cliente: Optional[int] = None):
    try:
        _data = {
            "id_tipo_notificacion": tipo,
            "id_modulo": TRABAJADOR_MODULO,
            "descripcion": descripcion,
            "id_user": user_id,
            "urgente": 0,
            "id_key": str(id_trabajador),
        }
        if id_cliente:
            _data["id_cliente"] = id_cliente
        noti_model.create_notificacion(data=_data)
    except Exception:
        pass
    await manager.broadcast_json({
        "type": "NOTIFICACION_INVALIDATE",
        "source": "trabajadores",
        "id_trabajador": id_trabajador,
        "descripcion_notificacion": descripcion,
    })


# ================== CONFIG: CORREO ==================

_CFG_TRAB_DDL = """
CREATE TABLE IF NOT EXISTS configuracion_trabajadores (
    id_configuracion_trabajador INT          AUTO_INCREMENT PRIMARY KEY,
    correo_crear_trabajador     TINYINT(1)   NOT NULL DEFAULT 0,
    id_user                     INT          NOT NULL DEFAULT 0,
    active                      TINYINT(1)   NOT NULL DEFAULT 1,
    datetime                    DATETIME     NOT NULL
)
"""

def _ensure_cfg_trabajadores(conn):
    with conn.cursor() as cur:
        cur.execute(_CFG_TRAB_DDL)
    conn.commit()


_TRAB_CORREO_DEFAULTS = {
    "correo_crear_trabajador": False,
}


@router.get("/config/correo")
def get_config_correo_trabajadores(
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    from ..db import get_connection
    conn = get_connection()
    try:
        _ensure_cfg_trabajadores(conn)
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT correo_crear_trabajador
                FROM configuracion_trabajadores
                WHERE active = 1
                ORDER BY id_configuracion_trabajador DESC
                LIMIT 1
                """
            )
            row = cur.fetchone()
        if not row:
            return _TRAB_CORREO_DEFAULTS.copy()
        return {k: bool(v) for k, v in row.items()}
    finally:
        conn.close()


class ConfigCorreoTrabajadores(BaseModel):
    correo_crear_trabajador: bool = False
    model_config = ConfigDict(extra="ignore")


@router.put("/config/correo", status_code=200)
def save_config_correo_trabajadores(
    payload: ConfigCorreoTrabajadores,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    from ..db import get_connection
    user_id = int(_cu.get("id") or _cu.get("id_user") or 0)
    now = dt.datetime.now()
    conn = get_connection()
    try:
        _ensure_cfg_trabajadores(conn)
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT id_configuracion_trabajador
                FROM configuracion_trabajadores
                WHERE active = 1
                ORDER BY id_configuracion_trabajador DESC
                LIMIT 1
                """
            )
            existing = cur.fetchone()

        if existing:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE configuracion_trabajadores SET
                        correo_crear_trabajador = %s,
                        datetime                = %s
                    WHERE id_configuracion_trabajador = %s
                    """,
                    (int(payload.correo_crear_trabajador), now, existing["id_configuracion_trabajador"]),
                )
        else:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO configuracion_trabajadores
                        (correo_crear_trabajador, id_user, active, datetime)
                    VALUES (%s, %s, 1, %s)
                    """,
                    (int(payload.correo_crear_trabajador), user_id, now),
                )
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}


# ================== SCHEMAS ==================

class PuestoCreate(BaseModel):
    nombre: str
    model_config = ConfigDict(extra="ignore")


class TrabajadorCreate(BaseModel):
    nombre: str
    apellido: str
    fecha_nacimiento: Optional[str] = None
    id_puesto: Optional[int] = None
    model_config = ConfigDict(extra="ignore")


class TrabajadorUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    id_puesto: Optional[int] = None
    model_config = ConfigDict(extra="ignore")


class ContratoTrabajadorCreate(BaseModel):
    id_trabajador: int
    id_puesto: Optional[int] = None
    model_config = ConfigDict(extra="ignore")


# ================== PUESTOS ==================

@router.get("/puestos")
def get_puestos(
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    return trab_model.list_puestos()


@router.post("/puestos", status_code=201)
def crear_puesto(
    payload: PuestoCreate,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    return trab_model.create_puesto(payload.nombre)


# ================== TRABAJADORES ==================

@router.get("")
def get_trabajadores(
    search: Optional[str] = Query(None),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    return trab_model.list_trabajadores(search=search, id_cliente=tenant_id)


@router.post("", status_code=201)
async def crear_trabajador(
    payload: TrabajadorCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")
    result = trab_model.create_trabajador(payload.model_dump(), int(user_id), id_cliente=tenant_id)
    new_id = result["id_trabajador"]
    nombre = payload.model_dump().get("nombre") or f"#{new_id}"
    _log_audit_trabajador("CREATE", f"Trabajador '{nombre}' registrado", new_id, int(user_id))
    await _notify_trabajador(TIPO_CREACION, f"Nuevo trabajador '{nombre}' registrado", new_id, int(user_id), id_cliente=tenant_id)
    item = trab_model.get_trabajador_by_id(new_id)
    return {"id_trabajador": new_id, "item": item}


@router.get("/{id_trabajador}")
def get_trabajador(
    id_trabajador: int,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = trab_model.get_trabajador_by_id(id_trabajador)
    if not row:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    return row


@router.patch("/{id_trabajador}")
async def actualizar_trabajador(
    id_trabajador: int,
    payload: TrabajadorUpdate,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = trab_model.get_trabajador_by_id(id_trabajador)
    if not row:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    trab_model.update_trabajador(id_trabajador, data)
    nombre = row.get("nombre") or f"#{id_trabajador}"
    _log_audit_trabajador("UPDATE", f"Trabajador '{nombre}' actualizado", id_trabajador, _cu.get("id", 0), changes=data)
    await _notify_trabajador(TIPO_ACTUALIZACION, f"Trabajador '{nombre}' actualizado", id_trabajador, _cu.get("id", 0), id_cliente=row.get("id_cliente"))
    item = trab_model.get_trabajador_by_id(id_trabajador)
    return {"updated": 1, "item": item}


@router.post("/{id_trabajador}/imagen", status_code=200)
async def subir_imagen_trabajador(
    id_trabajador: int,
    file: UploadFile = File(...),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = trab_model.get_trabajador_by_id(id_trabajador)
    if not row:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")

    id_cliente = row.get("id_cliente") or 0
    dest_dir = FsPath("uploads") / str(id_cliente) / "trabajadores" / str(id_trabajador)
    dest_dir.mkdir(parents=True, exist_ok=True)

    original_filename = file.filename
    safe_name = re.sub(r"[^\w.\-]", "_", original_filename)
    timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    stored_name = f"{timestamp}_{safe_name}"
    dest_path = dest_dir / stored_name

    with dest_path.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)

    rel_path = str(dest_path).replace("\\", "/")
    trab_model.update_trabajador_imagen(id_trabajador, original_filename, rel_path)

    return {"filename": original_filename, "path": rel_path}


@router.get("/{id_trabajador}/analisis")
def get_analisis_trabajador(
    id_trabajador: int,
    date_from: str = Query(...),
    date_to: str = Query(...),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = trab_model.get_trabajador_by_id(id_trabajador)
    if not row:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    return trab_model.get_trabajador_analisis(id_trabajador, date_from, date_to)


@router.delete("/{id_trabajador}")
def eliminar_trabajador(
    id_trabajador: int,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = trab_model.get_trabajador_by_id(id_trabajador)
    if not row:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    trab_model.delete_trabajador(id_trabajador)
    _log_audit_trabajador("DELETE", f"Trabajador #{id_trabajador} eliminado", id_trabajador, _cu.get("id", 0))
    return {"deleted": 1, "id_trabajador": id_trabajador}


@router.get("/{id_trabajador}/actividad")
def get_actividad_trabajador(
    id_trabajador: int,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    items, total = audit_model.list_audit_logs(
        filters={"id_modulo": TRABAJADOR_MODULO, "id_key": str(id_trabajador)},
        limit=limit,
        offset=offset,
    )
    return {"items": items, "total": total}
