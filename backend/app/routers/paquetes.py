from __future__ import annotations
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from ..deps import get_current_user
from ..models import paquetes as paq_model

router = APIRouter(prefix="/paquetes", tags=["paquetes"])


class PaqueteCreate(BaseModel):
    nombre: str
    is_paquete_sonido: bool
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
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    return paq_model.list_paquetes(tipo=tipo, search=search)


@router.post("", status_code=201)
def crear_paquete(
    payload: PaqueteCreate,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    nombre = (payload.nombre or "").strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="Nombre requerido")
    return paq_model.create_paquete(nombre, payload.is_paquete_sonido)


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
    is_sonido: bool = Query(...),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = paq_model.get_paquete_by_id(id_paquete, is_sonido)
    if not row:
        raise HTTPException(status_code=404, detail="Paquete no encontrado")
    return row


@router.patch("/{id_paquete}")
def actualizar_paquete(
    id_paquete: int,
    payload: PaqueteUpdate,
    is_sonido: bool = Query(...),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = paq_model.get_paquete_by_id(id_paquete, is_sonido)
    if not row:
        raise HTTPException(status_code=404, detail="Paquete no encontrado")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "active" in data:
        data["active"] = int(data["active"])
    paq_model.update_paquete(id_paquete, is_sonido, data)
    updated = paq_model.get_paquete_by_id(id_paquete, is_sonido)
    return {"updated": 1, "item": updated}


@router.delete("/{id_paquete}")
def eliminar_paquete(
    id_paquete: int,
    is_sonido: bool = Query(...),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    affected = paq_model.delete_paquete(id_paquete, is_sonido)
    if not affected:
        raise HTTPException(status_code=404, detail="Paquete no encontrado")
    return {"deleted": 1}


@router.get("/{id_paquete}/analisis")
def get_analisis_paquete(
    id_paquete: int,
    is_sonido: bool = Query(...),
    date_from: str = Query(...),
    date_to: str = Query(...),
    date_field: str = Query("fecha_evento"),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = paq_model.get_paquete_by_id(id_paquete, is_sonido)
    if not row:
        raise HTTPException(status_code=404, detail="Paquete no encontrado")
    return paq_model.get_paquete_analisis(id_paquete, is_sonido, date_from, date_to, date_field)


@router.post("/{id_paquete}/contenidos", status_code=201)
def add_contenido(
    id_paquete: int,
    payload: ContenidoCreate,
    is_sonido: bool = Query(...),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    descripcion = (payload.descripcion or "").strip()
    if not descripcion:
        raise HTTPException(status_code=400, detail="Descripción requerida")
    row = paq_model.get_paquete_by_id(id_paquete, is_sonido)
    if not row:
        raise HTTPException(status_code=404, detail="Paquete no encontrado")
    return paq_model.add_contenido(id_paquete, is_sonido, descripcion)
