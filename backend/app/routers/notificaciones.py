# routes/notificaciones.py
from __future__ import annotations

from typing import Any, Dict, Optional
from datetime import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, field_validator

from ..deps import get_current_user
from ..models import notificaciones as notificaciones_model

router = APIRouter(prefix="/notificaciones", tags=["notificaciones"])


# =============================
# Schemas
# =============================
class NotificacionBase(BaseModel):
    active: Optional[int] = None
    id_tipo_notificacion: Optional[int] = None
    datetime: Optional[dt] = None
    id_modulo: Optional[int] = None
    descripcion: Optional[str] = None
    id_user: Optional[int] = None
    urgente: Optional[int] = None
    fecha_notificacion: Optional[dt] = None
    leido: Optional[int] = None

    model_config = ConfigDict(extra="allow")

    @field_validator(
        "active",
        "id_tipo_notificacion",
        "id_modulo",
        "id_user",
        "urgente",
        "leido",
    )
    @classmethod
    def _to_int(cls, v):
        if v is None:
            return v
        return int(v)


class NotificacionCreate(NotificacionBase):
    pass


class NotificacionUpdate(NotificacionBase):
    pass


# =============================
# Endpoints
# =============================
@router.post("", status_code=status.HTTP_201_CREATED, summary="Crear notificación")
def create_notificacion(
    payload: NotificacionCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")

    try:
        data = payload.model_dump(exclude_none=True)

        # Forzamos id_user desde el token (no del cliente)
        data["id_user"] = user_id

        new_id = notificaciones_model.create_notificacion(data=data)
        return {"id": new_id}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("", summary="Listado de notificaciones (sin filtros)")
def list_notificaciones(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    user_id = current_user.get("id")
    items = notificaciones_model.list_notificaciones()
    return {"items": items, "count": len(items),"user_id":user_id}


@router.get("/cards", summary="Cards de notificaciones (sin filtros)")
def list_notificaciones_cards(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    items = notificaciones_model.list_notificaciones()
    return {"items": items, "count": len(items)}


@router.get("/{id_notificacion}", summary="Obtener notificación por id")
def get_notificacion_by_id(
    id_notificacion: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    user_id = current_user.get("id")
    row = notificaciones_model.get_notificacion_by_id(id_notificacion=id_notificacion,id_user=user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return row


@router.patch("/{id_notificacion}", summary="Actualizar notificación por id")
def update_notificacion_by_id(
    id_notificacion: int,
    payload: NotificacionUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        data = payload.model_dump(exclude_none=True)

        # Seguridad: no permitimos que el cliente reasigne dueño
        if "id_user" in data:
            data.pop("id_user", None)

        updated = notificaciones_model.update_notificacion_by_id(
            id_notificacion=id_notificacion,
            data=data,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if updated == 0 and not notificaciones_model.get_notificacion_by_id(id_notificacion=id_notificacion):
        raise HTTPException(status_code=404, detail="Notificación no encontrada")

    return {"updated": updated}


@router.delete("/{id_notificacion}", summary="Eliminar (soft delete) notificación por id")
def delete_notificacion_by_id(
    id_notificacion: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    updated = notificaciones_model.soft_delete_notificacion_by_id(id_notificacion=id_notificacion)
    if updated == 0:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return {"deleted": updated}