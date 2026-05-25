from __future__ import annotations
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
import datetime as dt
from ..deps import get_current_user, get_tenant_filter
from ..models import clientes_events as ce_model
from ..models import audit as audit_model

CLIENTES_EVENTS_MODULO = 8

router = APIRouter(prefix="/events/clientes", tags=["events-clientes"])

_ACCESS_DENIED = "Acceso denegado."


def _uid(cu: Dict) -> int:
    return int(cu.get("id") or cu.get("id_user") or 0)


def _log(action: str, message: str, id_cliente: int, user_id: int, changes=None):
    try:
        audit_model.create_audit_log(data={
            "action": action,
            "message": message,
            "id_user": user_id,
            "id_modulo": CLIENTES_EVENTS_MODULO,
            "id_key": str(id_cliente),
            "changes": changes,
        })
    except Exception:
        pass


# ================== SCHEMAS ==================

def _calc_proxima_fecha(tipo: str) -> str:
    today = dt.date.today()
    if tipo == "anual":
        return today.replace(year=today.year + 1).isoformat()
    if today.month == 12:
        return today.replace(year=today.year + 1, month=1).isoformat()
    return today.replace(month=today.month + 1).isoformat()


class ClienteCreate(BaseModel):
    nombre_cliente: str
    apellido_cliente: str
    rfc: Optional[str] = None
    correo: Optional[str] = None
    celular: Optional[str] = None
    tipo_suscripcion: str = "mensual"
    habilitar_sistema: Optional[bool] = False
    model_config = ConfigDict(extra="ignore")


class ClienteUpdate(BaseModel):
    nombre_cliente: Optional[str] = None
    apellido_cliente: Optional[str] = None
    rfc: Optional[str] = None
    correo: Optional[str] = None
    celular: Optional[str] = None
    tipo_suscripcion: Optional[str] = None
    habilitar_sistema: Optional[bool] = None
    model_config = ConfigDict(extra="ignore")


class PagoCreate(BaseModel):
    monto: str
    fecha_pago: Optional[str] = None
    model_config = ConfigDict(extra="ignore")


# ================== ENDPOINTS ==================

@router.get("")
def get_clientes(
    search: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    print(tenant_id)
    return ce_model.list_clientes(search=search, id_cliente=tenant_id)


@router.post("", status_code=201)
def crear_cliente(
    payload: ClienteCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    if payload.correo:
        email_error = ce_model.check_email_available_for_cliente(payload.correo.strip())
        if email_error:
            raise HTTPException(status_code=400, detail=email_error)

    user_id = _uid(current_user)
    data = payload.model_dump()
    data["fecha_proxima_pago"] = _calc_proxima_fecha(data.pop("tipo_suscripcion", "mensual"))
    print("pasas 0")
    result = ce_model.create_cliente(data, user_id)
    new_id = result["id_cliente"]
    nombre = f"{payload.nombre_cliente} {payload.apellido_cliente}".strip()
    _log("CREATE", f"Cliente '{nombre}' registrado", new_id, user_id)
    item = ce_model.get_cliente_by_id(new_id)
    return {"id_cliente": new_id, "item": item}


@router.get("/{id_cliente}")
def get_cliente(
    id_cliente: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    # Client users can only fetch their own profile
    if tenant_id is not None and tenant_id != id_cliente:
        raise HTTPException(status_code=403, detail=_ACCESS_DENIED)

    row = ce_model.get_cliente_by_id(id_cliente)
    if not row:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return row


@router.patch("/{id_cliente}")
def actualizar_cliente(
    id_cliente: int,
    payload: ClienteUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    # Client users can only edit their own profile
    if tenant_id is not None and tenant_id != id_cliente:
        raise HTTPException(status_code=403, detail=_ACCESS_DENIED)

    row = ce_model.get_cliente_by_id(id_cliente)
    if not row:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "tipo_suscripcion" in data:
        data["fecha_proxima_pago"] = _calc_proxima_fecha(data.pop("tipo_suscripcion"))
    ce_model.update_cliente(id_cliente, data)
    user_id = _uid(current_user)
    nombre = f"{row.get('nombre_cliente','')} {row.get('apellido_cliente','')}".strip()
    _log("UPDATE", f"Cliente '{nombre}' actualizado", id_cliente, user_id, changes=data)
    item = ce_model.get_cliente_by_id(id_cliente)
    return {"updated": 1, "item": item}


@router.delete("/{id_cliente}")
def eliminar_cliente(
    id_cliente: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    row = ce_model.get_cliente_by_id(id_cliente)
    if not row:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    ce_model.delete_cliente(id_cliente)
    user_id = _uid(current_user)
    _log("DELETE", f"Cliente #{id_cliente} eliminado", id_cliente, user_id)
    return {"deleted": 1, "id_cliente": id_cliente}


# ================== PAGOS ==================

@router.get("/{id_cliente}/pagos")
def get_pagos(
    id_cliente: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    if tenant_id is not None and tenant_id != id_cliente:
        raise HTTPException(status_code=403, detail=_ACCESS_DENIED)

    if not ce_model.get_cliente_by_id(id_cliente):
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return ce_model.list_pagos(id_cliente)


@router.post("/{id_cliente}/pagos", status_code=201)
def crear_pago(
    id_cliente: int,
    payload: PagoCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    row = ce_model.get_cliente_by_id(id_cliente)
    if not row:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    user_id = _uid(current_user)
    result = ce_model.create_pago(id_cliente, payload.model_dump(), user_id)
    nombre = f"{row.get('nombre_cliente','')} {row.get('apellido_cliente','')}".strip()
    _log("CREATE", f"Pago de ${payload.monto} registrado para '{nombre}'", id_cliente, user_id)
    return result


@router.delete("/{id_cliente}/pagos/{id_pago}")
def eliminar_pago(
    id_cliente: int,
    id_pago: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    affected = ce_model.delete_pago(id_pago)
    if not affected:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    return {"deleted": 1}


# ================== ACTIVIDAD ==================

@router.get("/{id_cliente}/actividad")
def get_actividad(
    id_cliente: int,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    if tenant_id is not None and tenant_id != id_cliente:
        raise HTTPException(status_code=403, detail=_ACCESS_DENIED)

    items, total = audit_model.list_audit_logs(
        filters={"id_modulo": CLIENTES_EVENTS_MODULO, "id_key": str(id_cliente)},
        limit=limit,
        offset=offset,
    )
    return {"items": items, "total": total}
