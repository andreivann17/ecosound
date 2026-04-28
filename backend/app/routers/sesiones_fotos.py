from __future__ import annotations
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict
from ..deps import get_current_user
from ..models import sesiones_fotos as sesion_model
from ..models import agenda as agenda_model
from ..realtime.ws_manager import manager
from ..db import get_connection
import datetime as dt

router = APIRouter(prefix="/sesiones-fotos", tags=["sesiones-fotos"])


# ================== MODELOS ==================

class SesionCreate(BaseModel):
    nombre_cliente: str
    id_ciudad: Optional[int] = None
    lugar: Optional[str] = None
    fecha_sesion: Any = None
    comentarios: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class SesionUpdate(BaseModel):
    nombre_cliente: Optional[str] = None
    id_ciudad: Optional[int] = None
    lugar: Optional[str] = None
    fecha_sesion: Optional[str] = None
    comentarios: Optional[str] = None

    model_config = ConfigDict(extra="forbid")


# ================== HELPERS ==================

def _parse_dt(val) -> Optional[dt.datetime]:
    if val is None:
        return None
    if isinstance(val, dt.datetime):
        return val
    s = str(val).strip()
    if not s:
        return None
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        return dt.datetime.fromisoformat(s)
    except Exception:
        raise ValueError(f"Fecha inválida: {val}")


def _find_agenda_sesion_conn(conn, id_sesion: int) -> Optional[Dict[str, Any]]:
    """Busca la entrada de agenda activa para una sesión por source."""
    with conn.cursor(dictionary=True) as cur:
        cur.execute(
            """SELECT id_agenda, id_user FROM agenda
               WHERE source_table = 'sesiones_fotos' AND source_id = %s AND active = 1
               LIMIT 1""",
            (id_sesion,),
        )
        return cur.fetchone()


def _build_agenda_payload(
    nombre_cliente: str,
    lugar: Optional[str],
    fecha_sesion: dt.datetime,
    id_sesion: int,
    id_ciudad: Optional[int] = None,
) -> Dict[str, Any]:
    end_dt = fecha_sesion + dt.timedelta(hours=1)
    return {
        "start_at": fecha_sesion,
        "end_at": end_dt,
        "title": f"Sesión {nombre_cliente}".strip(),
        "source_table": "sesiones_fotos",
        "all_day": 0,
        "status": "active",
        "location": lugar or None,
        "description": f"Sesión fotográfica para {nombre_cliente}.",
        "source_id": id_sesion,
        "ciudad_id": id_ciudad,
        "reminder": "15m",
        "url": f"/sesiones/{id_sesion}",
        "in_person": 1,
        "recurrence": None,
    }


# ================== ENDPOINTS ==================

@router.post("", status_code=201)
async def crear_sesion(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")

    try:
        payload_dict = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON inválido")

    fecha_sesion: Optional[dt.datetime] = None
    if payload_dict.get("fecha_sesion"):
        try:
            fecha_sesion = _parse_dt(payload_dict["fecha_sesion"])
            payload_dict["fecha_sesion"] = fecha_sesion
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    allowed_fields = SesionCreate.model_fields.keys()
    basic_data = {k: v for k, v in payload_dict.items() if k in allowed_fields}
    payload = SesionCreate(**basic_data)

    conn = get_connection()
    new_id: Optional[int] = None
    id_agenda: Optional[int] = None

    try:
        try:
            conn.autocommit = False
        except Exception:
            pass
        try:
            with conn.cursor() as cur:
                cur.execute("START TRANSACTION")

            result = sesion_model.create_sesion(
                data=payload.model_dump(exclude_none=True),
                id_user_created=user_id,
                conn=conn,
            )
            new_id = result["id_sesion"]

            if fecha_sesion and new_id:
                agenda_payload = _build_agenda_payload(
                    nombre_cliente=payload.nombre_cliente,
                    lugar=payload.lugar,
                    fecha_sesion=fecha_sesion,
                    id_sesion=new_id,
                    id_ciudad=payload.id_ciudad,
                )
                agenda_row = agenda_model.create_agenda_conn(conn, int(user_id), 1, agenda_payload)
                id_agenda = agenda_row.get("id_agenda") or agenda_row.get("id")

            conn.commit()
        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

    if id_agenda:
        await manager.broadcast_json({
            "type": "AGENDA_INVALIDATE",
            "source": "sesiones_fotos",
            "id_sesion": new_id,
            "id_agenda": int(id_agenda),
        })

    item = sesion_model.get_sesion_by_id(new_id)
    return {"id": new_id, "item": item}


@router.get("")
def list_sesiones(
    nombre_cliente: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    active: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(None, ge=0),
    _current_user: Dict[str, Any] = Depends(get_current_user),
):
    return sesion_model.list_sesiones(
        nombre_cliente=nombre_cliente,
        date_from=date_from,
        date_to=date_to,
        active=active,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get("/{id_sesion}")
def get_sesion(
    id_sesion: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    row = sesion_model.get_sesion_by_id(id_sesion)
    if not row:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return row


@router.patch("/{id_sesion}")
async def actualizar_sesion(
    id_sesion: int,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")

    row = sesion_model.get_sesion_by_id(id_sesion)
    if not row:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    try:
        payload_dict = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON inválido")

    fecha_sesion: Optional[dt.datetime] = None
    if payload_dict.get("fecha_sesion"):
        try:
            fecha_sesion = _parse_dt(payload_dict["fecha_sesion"])
            payload_dict["fecha_sesion"] = fecha_sesion
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    conn = get_connection()
    new_id_agenda: Optional[int] = None
    should_ws = False

    try:
        try:
            conn.autocommit = False
        except Exception:
            pass
        try:
            with conn.cursor() as cur:
                cur.execute("START TRANSACTION")

            sesion_model.update_sesion(id_sesion=id_sesion, data=payload_dict, conn=conn)

            _AGENDA_RELEVANT_SESION = {"fecha_sesion", "id_ciudad", "lugar"}
            if _AGENDA_RELEVANT_SESION & set(payload_dict.keys()):
                if fecha_sesion:
                    eff_fecha = fecha_sesion
                else:
                    raw_fecha = row.get("fecha_sesion")
                    eff_fecha = raw_fecha if isinstance(raw_fecha, dt.datetime) else _parse_dt(raw_fecha)

                if eff_fecha:
                    nombre_cliente = payload_dict.get("nombre_cliente") or row.get("nombre_cliente") or ""
                    lugar = payload_dict.get("lugar") if "lugar" in payload_dict else row.get("lugar")
                    id_ciudad = payload_dict.get("id_ciudad") if "id_ciudad" in payload_dict else row.get("id_ciudad")
                    agenda_payload = _build_agenda_payload(
                        nombre_cliente=nombre_cliente,
                        lugar=lugar,
                        fecha_sesion=eff_fecha,
                        id_sesion=id_sesion,
                        id_ciudad=id_ciudad,
                    )

                    existing = _find_agenda_sesion_conn(conn, id_sesion)
                    if existing:
                        old_id_agenda = existing["id_agenda"]
                        old_row = agenda_model.get_agenda_raw_by_id_conn(
                            conn, int(existing["id_user"]), old_id_agenda
                        )
                        changed = agenda_model._agenda_changed_db(old_row, agenda_payload) if old_row else True
                        if changed:
                            agenda_model.disable_agenda_conn(conn, old_id_agenda, int(user_id))
                            agenda_row = agenda_model.create_agenda_conn(conn, int(user_id), 1, agenda_payload)
                            new_id_agenda = int(agenda_row.get("id") or agenda_row.get("id_agenda"))
                            should_ws = True
                        else:
                            new_id_agenda = old_id_agenda
                    else:
                        agenda_row = agenda_model.create_agenda_conn(conn, int(user_id), 1, agenda_payload)
                        new_id_agenda = int(agenda_row.get("id") or agenda_row.get("id_agenda"))
                        should_ws = True

            conn.commit()
        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

    if should_ws and new_id_agenda:
        await manager.broadcast_json({
            "type": "AGENDA_INVALIDATE",
            "source": "sesiones_fotos",
            "id_sesion": id_sesion,
            "id_agenda": new_id_agenda,
        })

    item = sesion_model.get_sesion_by_id(id_sesion)
    return {"updated": 1, "item": item}


@router.delete("/{id_sesion}", status_code=200)
def eliminar_sesion(
    id_sesion: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE sesiones SET active = 0 WHERE id_sesion = %s",
                (id_sesion,),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Sesión no encontrada")
        conn.commit()
    finally:
        conn.close()

    return {"deleted": 1, "id_sesion": id_sesion}
