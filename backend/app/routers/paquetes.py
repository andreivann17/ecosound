from __future__ import annotations
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from ..deps import get_current_user, get_tenant_filter
from ..models import paquetes as paq_model
from ..models import audit as audit_model
from ..models import notificaciones as noti_model
from ..realtime.ws_manager import manager

PAQUETE_MODULO = 4
TIPO_CREACION = 1
TIPO_ACTUALIZACION = 2
TIPO_ELIMINACION = 3

_TIPO_LABEL = {0: "fotografía", 1: "sonido", 2: "decoraciones", 3: "barra"}

router = APIRouter(prefix="/paquetes", tags=["paquetes"])


def _log_audit_paquete(action: str, message: str, id_paquete: int, user_id: int, changes=None):
    try:
        audit_model.create_audit_log(data={
            "action": action,
            "message": message,
            "id_user": user_id,
            "id_modulo": PAQUETE_MODULO,
            "id_key": str(id_paquete),
            "changes": changes,
        })
    except Exception:
        pass


async def _notify_paquete(tipo: int, descripcion: str, id_paquete: int, user_id: int, id_cliente: Optional[int] = None):
    try:
        _data = {
            "id_tipo_notificacion": tipo,
            "id_modulo": PAQUETE_MODULO,
            "descripcion": descripcion,
            "id_user": user_id,
            "urgente": 0,
            "id_key": str(id_paquete),
        }
        if id_cliente:
            _data["id_cliente"] = id_cliente
        noti_model.create_notificacion(data=_data)
    except Exception:
        pass
    await manager.broadcast_json({
        "type": "NOTIFICACION_INVALIDATE",
        "source": "paquetes",
        "id_paquete": id_paquete,
        "descripcion_notificacion": descripcion,
    })


class PaqueteCreate(BaseModel):
    nombre: str
    tipo: int
    model_config = ConfigDict(extra="ignore")


class PaqueteUpdate(BaseModel):
    nombre: Optional[str] = None
    active: Optional[bool] = None
    model_config = ConfigDict(extra="ignore")


class ContenidoCreate(BaseModel):
    descripcion: str
    model_config = ConfigDict(extra="ignore")


@router.get("")
def list_paquetes(
    tipo: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    return paq_model.list_paquetes(tipo=tipo, search=search, id_cliente=tenant_id)


@router.post("", status_code=201)
async def crear_paquete(
    payload: PaqueteCreate,
    _cu: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    nombre = (payload.nombre or "").strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="Nombre requerido")
    if payload.tipo not in (0, 1, 2, 3):
        raise HTTPException(status_code=400, detail="Tipo de paquete inválido")
    result = paq_model.create_paquete(nombre, payload.tipo, id_cliente=tenant_id)
    new_id = result.get("id") or result.get("id_paquete") or 0
    tipo_str = _TIPO_LABEL.get(payload.tipo, "paquete")
    _log_audit_paquete("CREATE", f"Paquete de {tipo_str} '{nombre}' creado", new_id, _cu.get("id", 0))
    await _notify_paquete(TIPO_CREACION, f"Nuevo paquete de {tipo_str} '{nombre}' registrado", new_id, _cu.get("id", 0), id_cliente=tenant_id)
    return result


@router.delete("/contenidos/{id_contenido}")
def delete_contenido(
    id_contenido: int,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    affected = paq_model.delete_contenido(id_contenido)
    if not affected:
        raise HTTPException(status_code=404, detail="Contenido no encontrado")
    return {"deleted": 1}


@router.get("/{id_paquete}")
def get_paquete(
    id_paquete: int,
    tipo: int = Query(...),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = paq_model.get_paquete_by_id(id_paquete, tipo)
    if not row:
        raise HTTPException(status_code=404, detail="Paquete no encontrado")
    return row


@router.patch("/{id_paquete}")
async def actualizar_paquete(
    id_paquete: int,
    payload: PaqueteUpdate,
    tipo: int = Query(...),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = paq_model.get_paquete_by_id(id_paquete, tipo)
    if not row:
        raise HTTPException(status_code=404, detail="Paquete no encontrado")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "active" in data:
        data["active"] = int(data["active"])
    paq_model.update_paquete(id_paquete, tipo, data)
    updated = paq_model.get_paquete_by_id(id_paquete, tipo)
    _log_audit_paquete("UPDATE", f"Paquete #{id_paquete} actualizado", id_paquete, _cu.get("id", 0), changes=data)
    await _notify_paquete(TIPO_ACTUALIZACION, f"Paquete '{row.get('nombre','#'+str(id_paquete))}' actualizado", id_paquete, _cu.get("id", 0), id_cliente=row.get("id_cliente"))
    return {"updated": 1, "item": updated}


@router.delete("/{id_paquete}")
def eliminar_paquete(
    id_paquete: int,
    tipo: int = Query(...),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    affected = paq_model.delete_paquete(id_paquete, tipo)
    if not affected:
        raise HTTPException(status_code=404, detail="Paquete no encontrado")
    return {"deleted": 1}


@router.get("/{id_paquete}/analisis")
def get_analisis_paquete(
    id_paquete: int,
    tipo: int = Query(...),
    date_from: str = Query(...),
    date_to: str = Query(...),
    date_field: str = Query("fecha_evento"),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = paq_model.get_paquete_by_id(id_paquete, tipo)
    if not row:
        raise HTTPException(status_code=404, detail="Paquete no encontrado")
    return paq_model.get_paquete_analisis(id_paquete, tipo, date_from, date_to, date_field)


@router.get("/{id_paquete}/actividad")
def get_actividad_paquete(
    id_paquete: int,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    items, total = audit_model.list_audit_logs(
        filters={"id_modulo": PAQUETE_MODULO, "id_key": str(id_paquete)},
        limit=limit,
        offset=offset,
    )
    return {"items": items, "total": total}


@router.post("/{id_paquete}/contenidos", status_code=201)
def add_contenido(
    id_paquete: int,
    payload: ContenidoCreate,
    tipo: int = Query(...),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    descripcion = (payload.descripcion or "").strip()
    if not descripcion:
        raise HTTPException(status_code=400, detail="Descripción requerida")
    row = paq_model.get_paquete_by_id(id_paquete, tipo)
    if not row:
        raise HTTPException(status_code=404, detail="Paquete no encontrado")
    return paq_model.add_contenido(id_paquete, tipo, descripcion, row.get("id_cliente"))
