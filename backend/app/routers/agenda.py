from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
import json
from pydantic import BaseModel, field_validator,Field
from typing import Optional, List, Literal, Dict, Any

from ..deps import get_current_user
from ..models import agenda as agenda_model

router = APIRouter(prefix="/agenda", tags=["agenda"])

Freq = Literal["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]
Dow = Literal["MO", "TU", "WE", "TH", "FR", "SA", "SU"]
Mode = Optional[Literal["BYMONTHDAY", "BYSETPOS"]]
DEFAULT_AGENDA_EVENTO_ID = 2  # SIEMPRE 2 para POST /agenda


class Recurrence(BaseModel):
    freq: Freq
    interval: int = 1

    byweekday: Optional[List[Dow]] = None

    mode: Mode = None
    bymonthday: Optional[int] = None
    bymonth: Optional[int] = None
    bysetpos: Optional[int] = None

    until: Optional[datetime] = None

    @field_validator("interval")
    @classmethod
    def _interval(cls, v: int) -> int:
        if v < 1 or v > 365:
            raise ValueError("interval out of range")
        return v


class AgendaCreate(BaseModel):
    start_at: datetime
    end_at: datetime
    title: str

    all_day: int = 0
    status: str = "active"  # active | canceled | completed
    location: Optional[str] = None
    description: Optional[str] = None

    ciudad_id: Optional[int] = None
    reminder: Optional[str] = "15m"
    in_person: int = 0

    # origen (opcionales; backend los puede manejar si aplica)
    source_table: Optional[str] = None
    source_id: Optional[int] = None

    recurrence: Optional[Recurrence] = None

    @field_validator("title")
    @classmethod
    def _title(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("title is required")
        if len(v) > 125:
            raise ValueError("title too long")
        return v

    @field_validator("end_at")
    @classmethod
    def _end_after_start(cls, end_at: datetime, info):
        start_at = info.data.get("start_at")
        if start_at and end_at <= start_at:
            raise ValueError("end_at must be greater than start_at")
        return end_at

    @field_validator("status")
    @classmethod
    def _status(cls, v: str) -> str:
        if v not in ("active", "canceled", "completed"):
            raise ValueError("invalid status")
        return v


class AgendaUpdate(BaseModel):
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    title: Optional[str] = None

    all_day: Optional[int] = None
    status: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None

    ciudad_id: Optional[int] = None
    reminder: Optional[str] = None
    in_person: Optional[int] = None

    source_table: Optional[str] = None
    source_id: Optional[int] = None

    # si viene null => quitar recurrencia
    recurrence: Optional[Recurrence] = None

    @field_validator("title")
    @classmethod
    def _title(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("title cannot be empty")
        if len(v) > 125:
            raise ValueError("title too long")
        return v

    @field_validator("status")
    @classmethod
    def _status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ("active", "canceled", "completed"):
            raise ValueError("invalid status")
        return v


class AgendaFilterBody(BaseModel):
    date_from: Optional[datetime] = Field(default=None, alias="from")
    date_to: Optional[datetime] = Field(default=None, alias="to")
    status: Optional[str] = None
    include_inactive: bool = False

    city_ids: List[int] = []
    include_other_cities: bool = False
    event_type_ids: List[int] = []
    contrato_tipo_ids: List[int] = []

@router.post("/filter", status_code=200)
def agenda_filter(
    body: AgendaFilterBody,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")

    items = agenda_model.list_agenda_post(
        id_user=int(user_id),
        date_from=body.date_from,
        date_to=body.date_to,
        status=body.status,
        include_inactive=body.include_inactive,
        city_ids=body.city_ids,
        include_other_cities=body.include_other_cities,
        event_type_ids=body.event_type_ids,
        contrato_tipo_ids=body.contrato_tipo_ids or [],
    )
    return {"items": items}
@router.get("", status_code=200)
def agenda_list(
    current_user: Dict[str, Any] = Depends(get_current_user),
    date_from: Optional[datetime] = Query(default=None, alias="from"),
    date_to: Optional[datetime] = Query(default=None, alias="to"),
    status: Optional[str] = Query(default=None),
    include_inactive: bool = Query(default=False),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")

    items = agenda_model.list_agenda(
        id_user=int(user_id),
        date_from=date_from,
        date_to=date_to,
        status=status,
        include_inactive=include_inactive,
    )
    return {"items": items}


@router.get("/by-source", status_code=200)
def agenda_by_source(
    source_table: str = Query(...),
    source_id: int = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")
    row = agenda_model.get_agenda_by_source(int(user_id), source_table, source_id)
    return row or {}


@router.get("/{id_agenda}", status_code=200)
def agenda_get(
    id_agenda: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")
 
    row = agenda_model.get_agenda_by_id(int(user_id), id_agenda)
    if not row:
        raise HTTPException(status_code=404, detail="Agenda event not found")
    return row



@router.post("", status_code=201)
def agenda_create(
    payload: str = Form(...),
    documento: UploadFile | None = File(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")

    try:
        payload_dict = json.loads(payload or "{}")
    except Exception:
        raise HTTPException(status_code=400, detail="payload inválido (JSON)")

    validated = AgendaCreate.model_validate(payload_dict)

    created = agenda_model.create_agenda_with_document(
        id_user=int(user_id),
        id_agenda_evento=DEFAULT_AGENDA_EVENTO_ID,
        payload=validated.model_dump(),
        documento=documento,
    )
    return created

@router.put("/{id_agenda}", status_code=200)
def agenda_update(
    id_agenda: int,
    payload: AgendaUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")

    data = payload.model_dump(exclude_unset=True)

    if "start_at" in data and "end_at" in data:
        if data["end_at"] <= data["start_at"]:
            raise HTTPException(status_code=422, detail="end_at must be greater than start_at")

    updated = agenda_model.update_agenda(int(user_id), id_agenda, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Agenda event not found")
    return updated


@router.delete("/{id_agenda}", status_code=200)
def agenda_delete(
    id_agenda: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")

    ok = agenda_model.delete_agenda_soft(int(user_id), id_agenda)
    if not ok:
        raise HTTPException(status_code=404, detail="Agenda event not found")
    return {"ok": True}
