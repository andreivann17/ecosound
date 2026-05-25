from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
import json
from pydantic import BaseModel, field_validator, Field, ConfigDict
from typing import Optional, List, Literal, Dict, Any

from ..deps import get_current_user, get_tenant_filter
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

# ── CONFIG: tipos de agenda ────────────────────────────────────────────────

class TipoAgendaCreate(BaseModel):
    nombre: str


@router.get("/config/tipos")
def list_tipos_agenda(
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    from ..db import get_connection
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            if tenant_id:
                cur.execute(
                    "SELECT id_agenda_evento, nombre FROM agenda_evento WHERE active = 1 AND id_cliente = %s ORDER BY nombre",
                    (tenant_id,),
                )
            else:
                cur.execute(
                    "SELECT id_agenda_evento, nombre FROM agenda_evento WHERE active = 1 ORDER BY nombre"
                )
            return cur.fetchall()
    finally:
        conn.close()


@router.post("/config/tipos", status_code=201)
def create_tipo_agenda(
    payload: TipoAgendaCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    from ..db import get_connection
    nombre = payload.nombre.strip()
    if not nombre:
        raise HTTPException(status_code=422, detail="nombre requerido")
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO agenda_evento (nombre, active, id_cliente) VALUES (%s, 1, %s)",
                (nombre, tenant_id),
            )
            conn.commit()
            new_id = cur.lastrowid
        return {"id_agenda_evento": new_id, "nombre": nombre}
    finally:
        conn.close()


@router.delete("/config/tipos/{id_tipo}")
def delete_tipo_agenda(
    id_tipo: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    from ..db import get_connection
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE agenda_evento SET active = 0 WHERE id_agenda_evento = %s", (id_tipo,)
            )
            conn.commit()
        return {"ok": True}
    finally:
        conn.close()


# ── CONFIG: correo ─────────────────────────────────────────────────────────

_CFG_AGENDA_DDL = """
CREATE TABLE IF NOT EXISTS configuracion_agenda (
    id_configuracion_agenda INT        AUTO_INCREMENT PRIMARY KEY,
    correo_crear_agenda     TINYINT(1) NOT NULL DEFAULT 0,
    id_user                 INT        NOT NULL DEFAULT 0,
    active                  TINYINT(1) NOT NULL DEFAULT 1,
    datetime                DATETIME   NOT NULL
)
"""


def _ensure_cfg_agenda(conn):
    with conn.cursor() as cur:
        cur.execute(_CFG_AGENDA_DDL)
    conn.commit()


_AGENDA_CORREO_DEFAULTS = {"correo_crear_agenda": False}


class ConfigCorreoAgenda(BaseModel):
    correo_crear_agenda: bool = False
    model_config = ConfigDict(extra="ignore")


@router.get("/config/correo")
def get_config_correo_agenda(current_user: Dict[str, Any] = Depends(get_current_user)):
    from ..db import get_connection
    conn = get_connection()
    try:
        _ensure_cfg_agenda(conn)
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT correo_crear_agenda FROM configuracion_agenda
                WHERE active = 1 ORDER BY id_configuracion_agenda DESC LIMIT 1
                """
            )
            row = cur.fetchone()
        if not row:
            return _AGENDA_CORREO_DEFAULTS.copy()
        return {k: bool(v) for k, v in row.items()}
    finally:
        conn.close()


@router.put("/config/correo", status_code=200)
def save_config_correo_agenda(
    payload: ConfigCorreoAgenda,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    from ..db import get_connection
    import datetime as _dt
    user_id = int(current_user.get("id") or current_user.get("id_user") or 0)
    now = _dt.datetime.now()
    conn = get_connection()
    try:
        _ensure_cfg_agenda(conn)
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT id_configuracion_agenda FROM configuracion_agenda
                WHERE active = 1 ORDER BY id_configuracion_agenda DESC LIMIT 1
                """
            )
            existing = cur.fetchone()
        if existing:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE configuracion_agenda
                    SET correo_crear_agenda = %s, datetime = %s
                    WHERE id_configuracion_agenda = %s
                    """,
                    (int(payload.correo_crear_agenda), now, existing["id_configuracion_agenda"]),
                )
        else:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO configuracion_agenda
                        (correo_crear_agenda, id_user, active, datetime)
                    VALUES (%s, %s, 1, %s)
                    """,
                    (int(payload.correo_crear_agenda), user_id, now),
                )
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}


@router.post("/filter", status_code=200)
def agenda_filter(
    body: AgendaFilterBody,
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
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
        id_cliente=tenant_id,
    )
    return {"items": items}
@router.get("", status_code=200)
def agenda_list(
    current_user: Dict[str, Any] = Depends(get_current_user),
    date_from: Optional[datetime] = Query(default=None, alias="from"),
    date_to: Optional[datetime] = Query(default=None, alias="to"),
    status: Optional[str] = Query(default=None),
    include_inactive: bool = Query(default=False),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
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
        id_cliente=tenant_id,
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
    tenant_id: Optional[int] = Depends(get_tenant_filter),
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
        id_cliente=tenant_id,
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
