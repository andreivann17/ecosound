from __future__ import annotations
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel, ConfigDict
from pathlib import Path as FsPath
import datetime as dt
import shutil
import re
from ..deps import get_current_user
from ..models import clientes as clientes_model
from ..models import audit as audit_model

UPLOADS_CLIENTES = FsPath("uploads")
TIPOS_UPLOAD = frozenset({"contratos", "imagenes", "documentos", "otros"})


def _dir_size(path: FsPath) -> int:
    if not path.exists():
        return 0
    return sum(f.stat().st_size for f in path.rglob("*") if f.is_file())


def _client_storage(id_cliente: int) -> dict:
    """Scans uploads/{id_cliente}/ and returns total + per-subfolder sizes."""
    client_dir = UPLOADS_CLIENTES / str(id_cliente)
    if not client_dir.exists():
        return {"total_bytes": 0, "por_tipo": {}}
    por_tipo = {}
    total = 0
    for sub in sorted(client_dir.iterdir()):
        if sub.is_dir():
            size = _dir_size(sub)
            por_tipo[sub.name] = size
            total += size
    return {"total_bytes": total, "por_tipo": por_tipo}

CLIENTES_MODULO = 8

router = APIRouter(prefix="/clientes", tags=["clientes"])


def _uid(cu: Dict) -> int:
    return int(cu.get("id") or cu.get("id_user") or 0)


def _log(action: str, message: str, id_cliente: int, user_id: int, changes=None):
    try:
        audit_model.create_audit_log(data={
            "action": action,
            "message": message,
            "id_user": user_id,
            "id_modulo": CLIENTES_MODULO,
            "id_key": str(id_cliente),
            "changes": changes,
        })
    except Exception:
        pass


def _calc_proxima_fecha(tipo: str) -> str:
    today = dt.date.today()
    if tipo == "anual":
        return today.replace(year=today.year + 1).isoformat()
    if today.month == 12:
        return today.replace(year=today.year + 1, month=1).isoformat()
    return today.replace(month=today.month + 1).isoformat()


# ================== SCHEMAS ==================

class ClienteCreate(BaseModel):
    nombre_cliente: str
    apellido_cliente: str
    rfc: Optional[str] = None
    correo: Optional[str] = None
    celular: Optional[str] = None
    tipo_suscripcion: str = "mensual"
    fecha_fin_prueba: Optional[str] = None
    habilitar_sistema: Optional[bool] = True
    model_config = ConfigDict(extra="ignore")


class ClienteUpdate(BaseModel):
    nombre_cliente: Optional[str] = None
    apellido_cliente: Optional[str] = None
    rfc: Optional[str] = None
    correo: Optional[str] = None
    celular: Optional[str] = None
    tipo_suscripcion: Optional[str] = None
    fecha_fin_prueba: Optional[str] = None
    habilitar_sistema: Optional[bool] = None
    model_config = ConfigDict(extra="ignore")


class PagoCreate(BaseModel):
    monto: str
    fecha_pago: Optional[str] = None
    model_config = ConfigDict(extra="ignore")


# ================== ENDPOINTS ==================

@router.get("")
def get_clientes(
    id_app: int = Query(...),
    search: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return clientes_model.list_clientes(id_app=id_app, search=search)


@router.post("", status_code=201)
def crear_cliente(
    payload: ClienteCreate,
    id_app: int = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    if payload.correo:
        email_error = clientes_model.check_email_available_for_cliente(payload.correo.strip())
        if email_error:
            raise HTTPException(status_code=400, detail=email_error)

    user_id = _uid(current_user)
    data = payload.model_dump()
    tipo = data.pop("tipo_suscripcion", "mensual")
    data["tipo_subscripcion"] = tipo
    if tipo == "prueba":
        # próximo pago coincide con el fin de la prueba
        data["fecha_proxima_pago"] = data.get("fecha_fin_prueba") or None
    else:
        data["fecha_proxima_pago"] = _calc_proxima_fecha(tipo)
        data["fecha_fin_prueba"] = None
    result = clientes_model.create_cliente(id_app=id_app, data=data, id_user=user_id)
    new_id = result["id_cliente"]
    nombre = f"{payload.nombre_cliente} {payload.apellido_cliente}".strip()
    _log("CREATE", f"Cliente '{nombre}' registrado", new_id, user_id)
    item = clientes_model.get_cliente_by_id(id_app=id_app, id_cliente=new_id)
    return {"id_cliente": new_id, "item": item}


@router.get("/{id_cliente}")
def get_cliente(
    id_cliente: int,
    id_app: int = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    row = clientes_model.get_cliente_by_id(id_app=id_app, id_cliente=id_cliente)
    if not row:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Auto-bloqueo cuando la prueba ha vencido
    fecha_fin = row.get("fecha_fin_prueba")
    if fecha_fin and row.get("habilitar_sistema") == 1:
        fecha_fin_date = dt.date.fromisoformat(fecha_fin) if isinstance(fecha_fin, str) else fecha_fin
        if fecha_fin_date < dt.date.today():
            clientes_model.update_cliente(
                id_app=id_app, id_cliente=id_cliente,
                data={"habilitar_sistema": False},
            )
            row["habilitar_sistema"] = 0

    return row


@router.patch("/{id_cliente}")
def actualizar_cliente(
    id_cliente: int,
    payload: ClienteUpdate,
    id_app: int = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    row = clientes_model.get_cliente_by_id(id_app=id_app, id_cliente=id_cliente)
    if not row:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "tipo_suscripcion" in data:
        tipo = data.pop("tipo_suscripcion")
        data["tipo_subscripcion"] = tipo
        if tipo == "prueba":
            data["fecha_proxima_pago"] = data.get("fecha_fin_prueba") or None
        else:
            data["fecha_proxima_pago"] = _calc_proxima_fecha(tipo)
            data["fecha_fin_prueba"] = None
    clientes_model.update_cliente(id_app=id_app, id_cliente=id_cliente, data=data)
    user_id = _uid(current_user)
    nombre = f"{row.get('nombre_cliente','')} {row.get('apellido_cliente','')}".strip()
    _log("UPDATE", f"Cliente '{nombre}' actualizado", id_cliente, user_id, changes=data)
    item = clientes_model.get_cliente_by_id(id_app=id_app, id_cliente=id_cliente)
    return {"updated": 1, "item": item}


@router.delete("/{id_cliente}")
def eliminar_cliente(
    id_cliente: int,
    id_app: int = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    row = clientes_model.get_cliente_by_id(id_app=id_app, id_cliente=id_cliente)
    if not row:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    clientes_model.delete_cliente(id_app=id_app, id_cliente=id_cliente)
    user_id = _uid(current_user)
    _log("DELETE", f"Cliente #{id_cliente} eliminado", id_cliente, user_id)
    return {"deleted": 1, "id_cliente": id_cliente}


# ================== PAGOS ==================

@router.get("/{id_cliente}/pagos")
def get_pagos(
    id_cliente: int,
    id_app: int = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    if not clientes_model.get_cliente_by_id(id_app=id_app, id_cliente=id_cliente):
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return clientes_model.list_pagos(id_app=id_app, id_cliente=id_cliente)


@router.post("/{id_cliente}/pagos", status_code=201)
def crear_pago(
    id_cliente: int,
    payload: PagoCreate,
    id_app: int = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    row = clientes_model.get_cliente_by_id(id_app=id_app, id_cliente=id_cliente)
    if not row:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    user_id = _uid(current_user)
    result = clientes_model.create_pago(id_app=id_app, id_cliente=id_cliente, data=payload.model_dump(), id_user=user_id)
    nombre = f"{row.get('nombre_cliente','')} {row.get('apellido_cliente','')}".strip()
    _log("CREATE", f"Pago de ${payload.monto} registrado para '{nombre}'", id_cliente, user_id)
    return result


@router.delete("/{id_cliente}/pagos/{id_pago}")
def eliminar_pago(
    id_cliente: int,
    id_pago: int,
    id_app: int = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    affected = clientes_model.delete_pago(id_pago)
    if not affected:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    return {"deleted": 1}


# ================== ACTIVIDAD ==================

@router.get("/{id_cliente}/actividad")
def get_actividad(
    id_cliente: int,
    id_app: int = Query(...),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    items, total = audit_model.list_audit_logs(
        filters={"id_modulo": CLIENTES_MODULO, "id_key": str(id_cliente)},
        limit=limit,
        offset=offset,
    )
    return {"items": items, "total": total}


# ================== ALMACENAMIENTO ==================

@router.get("/storage/resumen")
def get_storage_resumen(
    id_app: int = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    clientes = clientes_model.list_clientes(id_app=id_app)
    result = []
    total_global = 0
    for c in clientes:
        cid = c["id_cliente"]
        storage = _client_storage(cid)
        total_global += storage["total_bytes"]
        result.append({
            "id_cliente": cid,
            "nombre_cliente": c["nombre_cliente"],
            "apellido_cliente": c["apellido_cliente"],
            **storage,
        })
    result.sort(key=lambda x: x["total_bytes"], reverse=True)
    return {"clientes": result, "total_bytes": total_global}


@router.get("/{id_cliente}/storage/archivos")
def list_archivos(
    id_cliente: int,
    tipo: str = Query(...),
    id_app: int = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    tipo_dir = UPLOADS_CLIENTES / str(id_cliente) / tipo
    if not tipo_dir.exists():
        return []
    files = []
    for f in sorted(tipo_dir.rglob("*")):
        if f.is_file():
            stat = f.stat()
            rel = f.relative_to(UPLOADS_CLIENTES / str(id_cliente) / tipo)
            files.append({
                "nombre": f.name,
                "ruta_relativa": str(rel).replace("\\", "/"),
                "size_bytes": stat.st_size,
                "fecha": dt.datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "url": f"uploads/{id_cliente}/{tipo}/{str(rel).replace(chr(92), '/')}",
            })
    return files


@router.post("/{id_cliente}/storage/upload", status_code=201)
async def upload_archivo(
    id_cliente: int,
    tipo: str = Query(...),
    id_app: int = Query(...),
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    if not clientes_model.get_cliente_by_id(id_app=id_app, id_cliente=id_cliente):
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    dest_dir = UPLOADS_CLIENTES / str(id_cliente) / tipo
    dest_dir.mkdir(parents=True, exist_ok=True)

    safe_name = re.sub(r"[^\w.\-]", "_", file.filename or "archivo")
    timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    stored_name = f"{timestamp}_{safe_name}"
    dest_path = dest_dir / stored_name

    with dest_path.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)

    from ..utils.comprimir import compress_file_best_effort
    dest_path = compress_file_best_effort(dest_path)
    stored_name = dest_path.name
    stat = dest_path.stat()
    user_id = _uid(current_user)
    clientes_model.save_archivo_db(
        id_cliente=id_cliente, id_app=id_app, tipo=tipo,
        nombre_original=file.filename or safe_name,
        nombre_almacenado=stored_name,
        size_bytes=stat.st_size, id_user=user_id,
    )
    return {
        "nombre": stored_name,
        "nombre_original": file.filename,
        "size_bytes": stat.st_size,
        "fecha": dt.datetime.now().isoformat(),
        "url": f"uploads/{id_cliente}/{tipo}/{stored_name}",
    }


@router.delete("/{id_cliente}/storage/archivos/{filename}")
def delete_archivo(
    id_cliente: int,
    filename: str,
    tipo: str = Query(...),
    id_app: int = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    file_path = UPLOADS_CLIENTES / str(id_cliente) / tipo / filename
    try:
        file_path.resolve().relative_to(UPLOADS_CLIENTES.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Ruta inválida")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    file_path.unlink()
    clientes_model.delete_archivo_db(id_cliente=id_cliente, tipo=tipo, nombre_almacenado=filename)
    return {"deleted": 1, "nombre": filename}
