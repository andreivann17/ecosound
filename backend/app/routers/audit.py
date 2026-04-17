# routes/audit_log.py
from __future__ import annotations
from typing import Any, Dict, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, field_validator

from ..deps import get_current_user
from ..models import audit as audit_log_model

router = APIRouter(prefix="/audit-log", tags=["audit_log"])


# =============================
# Schemas
# =============================
# =============================
# Schemas
# =============================
class AuditLogBase(BaseModel):
    action: Optional[str] = None
    changes: Optional[Union[Dict[str, Any], str]] = None
    extra: Optional[Union[Dict[str, Any], str]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    id_user: Optional[int] = None
    id_modulo: Optional[int] = None
    id_key: Optional[Union[int, str]] = None  # <- CAMBIO
    message: Optional[str] = None

    model_config = ConfigDict(extra="allow")

    @field_validator("id_user", "id_modulo")  # <- QUITA id_key de aquí
    @classmethod
    def _to_int(cls, v):
        if v is None:
            return v
        return int(v)


class AuditLogCreate(AuditLogBase):
    action: str
    message: str


# =============================
# Endpoints
# =============================
@router.post("", status_code=status.HTTP_201_CREATED, summary="Crear audit log")
def create_audit_log(
    payload: AuditLogCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Crea un registro en audit_log.
    Nota: si no mandas id_user, se toma del token.
    """
    data = payload.model_dump(exclude_none=True)

    # Si tu get_current_user trae id_user, lo amarras aquí:
    if "id_user" not in data or data["id_user"] is None:
        try:
            data["id_user"] = int(current_user.get("id_user", 0) or 0)
        except Exception:
            data["id_user"] = 0

    try:
        new_id = audit_log_model.create_audit_log(data=data)
        return {"id": new_id}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("", summary="Listado de audit_log (con filtros por query params)")
def list_audit_logs(
    id_modulo: Optional[int] = Query(default=None),
    id_key: Optional[str] = Query(default=None),  # <- CAMBIO (era Optional[int])
    action: Optional[str] = Query(default=None),
    id_user: Optional[int] = Query(default=None),
    date_from: Optional[str] = Query(default=None, description="YYYY-MM-DD o YYYY-MM-DD HH:MM:SS"),
    date_to: Optional[str] = Query(default=None, description="YYYY-MM-DD o YYYY-MM-DD HH:MM:SS"),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    items, total = audit_log_model.list_audit_logs(
        filters={
            "id_modulo": id_modulo,
            "id_key": id_key,  # ahora puede ser "UAC-CI-2025-123"
            "action": action,
            "id_user": id_user,
            "date_from": date_from,
            "date_to": date_to,
        },
        limit=limit,
        offset=offset,
    )
    return {"items": items, "count": len(items), "total": total}


@router.get("/{id_audit_log}", summary="Obtener audit_log por id")
def get_audit_log(
    id_audit_log: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    row = audit_log_model.get_audit_log_by_id(id_audit_log=id_audit_log)
    if not row:
        raise HTTPException(status_code=404, detail="Audit log no encontrado")
    return row
