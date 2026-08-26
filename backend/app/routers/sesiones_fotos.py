from __future__ import annotations
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict
from ..deps import get_current_user, get_tenant_filter
from ..models import sesiones_fotos as sesion_model
from ..models import agenda as agenda_model
from ..models import audit as audit_model
from ..models import notificaciones as noti_model
from ..realtime.ws_manager import manager
from ..db import get_connection
import datetime as dt

SESION_MODULO = 3
TIPO_CREACION = 1
TIPO_ACTUALIZACION = 2
TIPO_ELIMINACION = 3

router = APIRouter(prefix="/sesiones-fotos", tags=["sesiones-fotos"])


def _log_audit_sesion(action: str, message: str, id_sesion: int, user_id: int,
                      changes=None, request: Request = None):
    try:
        ip_address = None
        user_agent = None
        if request is not None:
            fwd = request.headers.get("x-forwarded-for")
            ip_address = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else None)
            user_agent = request.headers.get("user-agent")
        audit_model.create_audit_log(data={
            "action": action,
            "message": message,
            "id_user": user_id,
            "id_modulo": SESION_MODULO,
            "id_key": str(id_sesion),
            "changes": changes,
            "ip_address": ip_address,
            "user_agent": user_agent,
        })
    except Exception:
        pass


async def _notify_sesion(tipo: int, descripcion: str, id_sesion: int, user_id: int, id_cliente: Optional[int] = None):
    try:
        _data = {
            "id_tipo_notificacion": tipo,
            "id_modulo": SESION_MODULO,
            "descripcion": descripcion,
            "id_user": user_id,
            "urgente": 0,
            "id_key": str(id_sesion),
        }
        if id_cliente:
            _data["id_cliente"] = id_cliente
        noti_model.create_notificacion(data=_data)
    except Exception:
        pass
    await manager.broadcast_json({
        "type": "NOTIFICACION_INVALIDATE",
        "source": "sesiones_fotos",
        "id_sesion": id_sesion,
        "descripcion_notificacion": descripcion,
        "id_user": user_id,
    })


# ================== CONFIG: TIPOS DE SESIÓN ==================

class TipoSesionCreate(BaseModel):
    nombre: str
    model_config = ConfigDict(extra="ignore")


@router.get("/config/tipos")
def list_tipos_sesion(
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id_tipo_sesion, nombre FROM tipo_sesion WHERE active = 1 ORDER BY nombre ASC"
            )
            return cur.fetchall() or []
    finally:
        conn.close()


@router.post("/config/tipos", status_code=201)
def create_tipo_sesion(
    payload: TipoSesionCreate,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    nombre = (payload.nombre or "").strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="Nombre requerido")
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id_tipo_sesion FROM tipo_sesion WHERE nombre = %s AND active = 1 LIMIT 1",
                (nombre,),
            )
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="Ya existe un tipo con ese nombre")
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO tipo_sesion (nombre, active) VALUES (%s, 1)",
                (nombre,),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id_tipo_sesion": new_id, "nombre": nombre}
    finally:
        conn.close()


@router.delete("/config/tipos/{id_tipo}", status_code=200)
def delete_tipo_sesion(
    id_tipo: int,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE tipo_sesion SET active = 0 WHERE id_tipo_sesion = %s AND active = 1",
                (id_tipo,),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Tipo no encontrado")
        conn.commit()
    finally:
        conn.close()
    return {"deleted": 1, "id_tipo_sesion": id_tipo}


# ================== CONFIG: CORREO ==================

_CFG_SES_DDL = """
CREATE TABLE IF NOT EXISTS configuracion_sesiones (
    id_configuracion_sesion INT        AUTO_INCREMENT PRIMARY KEY,
    correo_crear_sesion     TINYINT(1) NOT NULL DEFAULT 0,
    correo_hora_antes       TINYINT(1) NOT NULL DEFAULT 0,
    correo_dia_antes        TINYINT(1) NOT NULL DEFAULT 0,
    correo_semana_antes     TINYINT(1) NOT NULL DEFAULT 0,
    correo_mes_antes        TINYINT(1) NOT NULL DEFAULT 0,
    id_user                 INT        NOT NULL DEFAULT 0,
    active                  TINYINT(1) NOT NULL DEFAULT 1,
    datetime                DATETIME   NOT NULL
)
"""

def _ensure_cfg_sesiones(conn):
    with conn.cursor() as cur:
        cur.execute(_CFG_SES_DDL)
    conn.commit()


_SES_CORREO_DEFAULTS = {
    "correo_crear_sesion": False,
    "correo_hora_antes":   False,
    "correo_dia_antes":    False,
    "correo_semana_antes": False,
    "correo_mes_antes":    False,
}


@router.get("/config/correo")
def get_config_correo_sesiones(
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    conn = get_connection()
    try:
        _ensure_cfg_sesiones(conn)
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT correo_crear_sesion, correo_hora_antes, correo_dia_antes,
                       correo_semana_antes, correo_mes_antes
                FROM configuracion_sesiones
                WHERE active = 1
                ORDER BY id_configuracion_sesion DESC
                LIMIT 1
                """
            )
            row = cur.fetchone()
        if not row:
            return _SES_CORREO_DEFAULTS.copy()
        return {k: bool(v) for k, v in row.items()}
    finally:
        conn.close()


class ConfigCorreoSesiones(BaseModel):
    correo_crear_sesion: bool = False
    correo_hora_antes:   bool = False
    correo_dia_antes:    bool = False
    correo_semana_antes: bool = False
    correo_mes_antes:    bool = False
    model_config = ConfigDict(extra="ignore")


@router.put("/config/correo", status_code=200)
def save_config_correo_sesiones(
    payload: ConfigCorreoSesiones,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    user_id = int(_cu.get("id") or _cu.get("id_user") or 0)
    now = dt.datetime.now()
    conn = get_connection()
    try:
        _ensure_cfg_sesiones(conn)
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT id_configuracion_sesion
                FROM configuracion_sesiones
                WHERE active = 1
                ORDER BY id_configuracion_sesion DESC
                LIMIT 1
                """
            )
            existing = cur.fetchone()

        if existing:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE configuracion_sesiones SET
                        correo_crear_sesion = %s,
                        correo_hora_antes   = %s,
                        correo_dia_antes    = %s,
                        correo_semana_antes = %s,
                        correo_mes_antes    = %s,
                        datetime            = %s
                    WHERE id_configuracion_sesion = %s
                    """,
                    (
                        int(payload.correo_crear_sesion),
                        int(payload.correo_hora_antes),
                        int(payload.correo_dia_antes),
                        int(payload.correo_semana_antes),
                        int(payload.correo_mes_antes),
                        now,
                        existing["id_configuracion_sesion"],
                    ),
                )
        else:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO configuracion_sesiones
                        (correo_crear_sesion, correo_hora_antes, correo_dia_antes,
                         correo_semana_antes, correo_mes_antes, id_user, active, datetime)
                    VALUES (%s, %s, %s, %s, %s, %s, 1, %s)
                    """,
                    (
                        int(payload.correo_crear_sesion),
                        int(payload.correo_hora_antes),
                        int(payload.correo_dia_antes),
                        int(payload.correo_semana_antes),
                        int(payload.correo_mes_antes),
                        user_id,
                        now,
                    ),
                )
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}


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
    tenant_id: Optional[int] = Depends(get_tenant_filter),
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
                id_cliente=tenant_id,
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

    _log_audit_sesion("CREATE", f"Sesión de fotos creada", new_id, int(user_id))
    await _notify_sesion(TIPO_CREACION, f"Nueva sesión de fotos registrada (#{new_id})", new_id, int(user_id), id_cliente=tenant_id)

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
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    return sesion_model.list_sesiones(
        nombre_cliente=nombre_cliente,
        date_from=date_from,
        date_to=date_to,
        active=active,
        search=search,
        limit=limit,
        offset=offset,
        id_cliente=tenant_id,
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

    _log_audit_sesion("UPDATE", f"Sesión de fotos #{id_sesion} actualizada", id_sesion, int(user_id))
    await _notify_sesion(TIPO_ACTUALIZACION, f"Sesión de fotos #{id_sesion} actualizada", id_sesion, int(user_id), id_cliente=row.get("id_cliente"))

    item = sesion_model.get_sesion_by_id(id_sesion)
    return {"updated": 1, "item": item}


@router.delete("/{id_sesion}", status_code=200)
def eliminar_sesion(
    id_sesion: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id_contrato FROM contratos WHERE id_contrato = %s AND datetime_fotografia IS NOT NULL LIMIT 1",
                (id_sesion,),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Sesión no encontrada")
            cur.execute(
                "UPDATE contratos SET active = 0 WHERE id_contrato = %s",
                (id_sesion,),
            )
        conn.commit()
    finally:
        conn.close()

    _log_audit_sesion("DELETE", f"Sesión de fotos #{id_sesion} eliminada", id_sesion, current_user.get("id", 0))
    return {"deleted": 1, "id_sesion": id_sesion}


@router.get("/{id_sesion}/actividad")
def get_actividad_sesion(
    id_sesion: int,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    items, total = audit_model.list_audit_logs(
        filters={"id_modulo": SESION_MODULO, "id_key": str(id_sesion)},
        limit=limit,
        offset=offset,
    )
    return {"items": items, "total": total}
