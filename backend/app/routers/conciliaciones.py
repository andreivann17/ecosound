from __future__ import annotations
from typing import Any, Dict, Optional, List, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, Request, Body, File,Form,Path
from pydantic import BaseModel, ConfigDict
import json
from fastapi.responses import StreamingResponse
import io
import zipfile
from pathlib import Path as FsPath
from ..realtime.ws_manager import manager

from fastapi import status
import os
from ..deps import get_current_user
from ..models import conciliaciones as conciliacion_model
from ..models import agenda as agenda_model
from ..models import autoridades as autoridades_model
from ..models import empresas as empresas_model
from io import BytesIO
from io import BytesIO
import re

from fastapi.responses import StreamingResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import LETTER  # o A4 si prefieres
from reportlab.lib.units import mm
from reportlab.lib.utils import simpleSplit

from PyPDF2 import PdfReader, PdfWriter
from ..db import get_connection
import datetime as dt
import re  

router = APIRouter(prefix="/conciliaciones", tags=["conciliaciones"])
BASE_UPLOADS_CONCILIACIONES = FsPath("uploads/conciliaciones")

# ================== MODELOS ==================


class ConciliacionCreateBasic(BaseModel):
    expediente: Optional[str] = None
    id_empresa: Optional[int] = None   # ← aquí
    id_objeto: Optional[int] = None
    id_razon_social: Optional[int] = None

    # Nuevos que sí necesitas
    tipo_notificado: Optional[str] = None
    tipo_notificado_actuario: Optional[str] = None
    id_autoridad: int
    nombre_trabajador: str

    # Ya existentes
    fecha_emision_expediente: Optional[str] = None
    fecha_audiencia: str
    fecha_cita_notifcacion: Optional[str] = None
    id_abogado: Optional[int] = None
    abogado_contrario: Optional[str] = None
    razones_sociales_ids: Optional[List[int]] = None

    # NUEVOS DEL FRONT Y DEL BACK
    id_conciliacion_status: Optional[int] = None
    fecha_notificacion: Optional[str] = None
    id_medio_notificacion: Optional[int] = None

    model_config = ConfigDict(extra="ignore")





# ====== Update ======
class ConciliacionUpdate(BaseModel):
    expediente: str | None = None
    fecha_emision_expediente: str | None = None
    id_abogado: int | None = None
    abogado_contrario: str | None = None
    id_conciliacion_status: int | None = None
    id_empresa: int | None = None
    id_razon_social: int | None = None
    model_config = ConfigDict(extra="forbid")


# Mapeo de claves de archivo -> id_tipo_documento (ajusta IDs si difieren en tu BD)
DOC_KEY_TO_TIPO: Dict[str, int] = {
    "poderOriginal":  1,
    "copiaPoder":     2,
    "identificacion": 3,
    "contrato":       4,
    "citatorio":      5,
}

# ================== HELPERS ==================

async def _parse_payload_and_files(request: Request) -> Tuple[Dict[str, Any], List[Tuple[str, UploadFile]]]:
    """
    Devuelve (payload_dict, files)
    Soporta:
      - multipart/form-data con campo 'payload' (JSON) + archivos
      - application/json (sin archivos)
    """
    content_type = (request.headers.get("content-type") or "").lower()
    files: List[Tuple[str, UploadFile]] = []
    payload_dict: Dict[str, Any] = {}

    if "multipart/form-data" in content_type:
        form = await request.form()
        payload_raw = form.get("payload")
        if not payload_raw:
            raise HTTPException(status_code=400, detail="Falta 'payload' en FormData")
        try:
            payload_dict = json.loads(payload_raw)
        except Exception:
            raise HTTPException(status_code=400, detail="payload inválido (JSON)")

        # recolectar archivos (cualquier campo con .filename)
        for key, value in form.multi_items():
            if hasattr(value, "filename") and value.filename:
                files.append((key, value))  # (campo, UploadFile)
    else:
        try:
            payload_dict = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="JSON inválido")

    return payload_dict, files

def _save_files_for_conciliacion(
    files: List[Tuple[str, UploadFile]],
    id_conciliacion: int,
    id_user: int,
    conn,  # <-- MISMA conexión (si vienes desde create/update)
):
    """
    Valida claves de archivos contra DOC_KEY_TO_TIPO y delega guardado al modelo.
    """
    for key, upf in files:
        if key not in DOC_KEY_TO_TIPO:
            raise HTTPException(
                status_code=400,
                detail=f"Archivo '{key}' no mapeado a id_tipo_documento"
            )

        id_tipo =1 # <-- usar el mapa real

        conciliacion_model.add_documento_conciliacion(
            id_conciliacion=id_conciliacion,
            id_tipo_documento=id_tipo,
            filename=upf.filename,
            fileobj=upf.file,
            id_user=id_user,
            conn=conn,  # <-- MISMA conexión
        )

from typing import Optional
from pydantic import BaseModel
class ConciliacionCardsReq(BaseModel):
    expediente: Optional[str] = None
    id_status: Optional[int] = None


    id_estado: Optional[int] = None
    id_ciudad: Optional[int] = None
    id_autoridad: Optional[int] = None

    date_from: Optional[str] = None
    date_to: Optional[str] = None
    abogado_contrario: Optional[str] = None
    active: Optional[int] = None
    search: Optional[str] = None
    id_empresa: Optional[int] = None
    nombre_solicitante: Optional[str] = None
class ConciliacionCardsMultiReq(BaseModel):
    # filtros simples
    expediente: Optional[str] = None
    id_status: Optional[int] = None
    abogado_contrario: Optional[str] = None
    active: Optional[int] = 1
    search: Optional[str] = None
    nombre_solicitante: Optional[str] = None

    # filtros múltiples
    city_ids: Optional[List[int]] = None
    company_ids: Optional[List[int]] = None

    # fechas
    date_from: Optional[str] = None
    date_to: Optional[str] = None

    # opcional (para PDF / presets)
    preset: Optional[str] = None
    format: Optional[str] = None

@router.post("/cards-multi")
def conciliacion_cards_multi(
    payload: ConciliacionCardsMultiReq,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return conciliacion_model.cards_conciliacion_multi(
        expediente=payload.expediente,
        id_status=payload.id_status,
        city_ids=payload.city_ids,
        company_ids=payload.company_ids,
        date_from=payload.date_from,
        date_to=payload.date_to,
        abogado_contrario=payload.abogado_contrario,
        active=payload.active,
        search=payload.search,
        nombre_solicitante=payload.nombre_solicitante,
    )
# ------- CARDS -------
@router.post("/cards")
def conciliacion_cards(
    payload: ConciliacionCardsReq,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return conciliacion_model.cards_conciliacion(
        expediente=payload.expediente,
        id_status=payload.id_status,
        id_estado=payload.id_estado,
        id_ciudad=payload.id_ciudad,
        id_autoridad=payload.id_autoridad,
 
        date_from=payload.date_from,
        date_to=payload.date_to,
        abogado_contrario=payload.abogado_contrario,
        active=payload.active,
        search=payload.search,
        id_empresa=payload.id_empresa,
        nombre_solicitante=payload.nombre_solicitante,
    )
def _parse_dt(val) -> dt.datetime:
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
        ...
        raise ValueError(f"Fecha inválida: {val}")

def _cap_end_same_day(start_dt: dt.datetime) -> dt.datetime:
    end_dt = start_dt + dt.timedelta(hours=1)
    if end_dt.date() != start_dt.date():
        return start_dt.replace(hour=23, minute=59, second=0, microsecond=0)
    return end_dt

@router.post("", status_code=201)
async def crear_conciliacion(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")

    payload_dict, files = await _parse_payload_and_files(request)
    raw_payload = payload_dict

    # ==============================
    # Normalización de nombres desde el front
    # ==============================
    if "forma_notificacion" in payload_dict and "tipo_notificado" not in payload_dict:
        payload_dict["tipo_notificado"] = payload_dict.pop("forma_notificacion")

    if "origen_actuario" in payload_dict and "tipo_notificado_actuario" not in payload_dict:
        payload_dict["tipo_notificado_actuario"] = payload_dict.pop("origen_actuario")

    if "fecha_hora_cita_recepcion" in payload_dict and "fecha_notificacion" not in payload_dict:
        payload_dict["fecha_notificacion"] = payload_dict.pop("fecha_hora_cita_recepcion")

    if "medio_notificacion" in payload_dict and "id_medio_notificacion" not in payload_dict:
        payload_dict["id_medio_notificacion"] = payload_dict.pop("medio_notificacion")

    payload_dict.setdefault("id_conciliacion_status", 1)

    # ======================================================
    # BLOQUE 1: resolver EMPRESA (existente o nueva)
    # ======================================================
    id_empresa = raw_payload.get("id_empresa")
    empresa_nombre_nueva = (raw_payload.get("empresa_nombre_nueva") or "").strip()
    conn = get_connection()

    if id_empresa:
        try:
            id_empresa_int = int(id_empresa)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="id_empresa inválido")
        payload_dict["id_empresa"] = id_empresa_int

    elif empresa_nombre_nueva:
        cliente_directo = int(raw_payload.get("cliente_directo", 0))

        corresponsal_nombre = raw_payload.get("corresponsal_nombre")
        corresponsal_celular = raw_payload.get("corresponsal_celular")
        corresponsal_correo = raw_payload.get("corresponsal_correo")

        try:
            new_id_empresa = conciliacion_model.create_empresa_from_conciliacion(
                nombre=empresa_nombre_nueva,
                cliente_directo=cliente_directo,
                nombre_corresponsal=corresponsal_nombre,
                correo=corresponsal_correo,
                celular=corresponsal_celular,
                id_user_created=user_id,
                conn=conn,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        payload_dict["id_empresa"] = new_id_empresa

    # ======================
    # Limpiar extras para el Pydantic
    # OJO: debe salir de payload_dict (ya normalizado y con id_empresa resuelto)
    # ======================
    allowed_fields = ConciliacionCreateBasic.model_fields.keys()
    basic_data = {k: v for k, v in payload_dict.items() if k in allowed_fields}
    payload = ConciliacionCreateBasic(**basic_data)

    # ==============================
    # TRANSACCIÓN: conciliación + agenda + update conciliación.id_agenda
    # ==============================
    try:
        try:
            conn.autocommit = False
        except Exception:
            pass

        try:
            with conn.cursor() as cur:
                cur.execute("START TRANSACTION")

            # 1) crea conciliación (misma conexión)
            data_create = conciliacion_model.create_conciliacion_basic(
                data=payload.model_dump(exclude_none=True),
                id_user_created=user_id,
                conn=conn,
            )
            new_id = data_create["id_conciliacion"]
            exp_format = data_create.get("expediente_format") or "NO REGISTRADO"
          

            conciliacion_model.create_historial_inicial_conciliacion(
                id_conciliacion=new_id,
                data=payload_dict,  # usa lo ya normalizado
                id_user=user_id,
                conn=conn,
            )

            # ======================================================
            # BLOQUE 2: razones_sociales (existentes + nuevas)
            # ======================================================
            rs_ids_existentes = payload.razones_sociales_ids or []
            razones_nuevas_nombres = payload_dict.get("razones_sociales_nuevas") or []
            nuevos_rs_ids: List[int] = []

            if razones_nuevas_nombres:
                if not payload.id_empresa:
                    raise HTTPException(
                        status_code=400,
                        detail="No se puede crear razón social nueva sin empresa asociada.",
                    )

                nuevos_rs_ids = conciliacion_model.bulk_create_razones_sociales_nuevas(
                    nombres=razones_nuevas_nombres,
                    id_user_created=user_id,
                    id_empresa=payload.id_empresa,
                    conn=conn,
                )

            all_rs_ids = sorted(set(rs_ids_existentes + nuevos_rs_ids))

            if all_rs_ids and payload.id_empresa:
                conciliacion_model.bulk_insert_conciliacion_empresas(
                    id_conciliacion=new_id,
                    id_empresa=payload.id_empresa,
                    razones_ids=all_rs_ids,
                    id_user_created=user_id,
                    conn=conn,
                )

            # ==============================
            # 2) crear evento en AGENDA (audiencia) y amarrarlo a conciliación
            # ==============================
            aud_dt = _parse_dt(payload_dict.get("fecha_audiencia"))
            if not aud_dt:
                raise HTTPException(status_code=400, detail="fecha_audiencia es obligatoria para agenda")

            end_dt = _cap_end_same_day(aud_dt)

            solicitante = (
                payload_dict.get("nombre_solicitante")
                or payload_dict.get("nombre_trabajador")
                or ""
            ).strip()

            # --- FIX: usar el id_empresa YA RESUELTO ---
            id_empresa_resuelto = payload_dict.get("id_empresa")

            # empresa: si hay id_empresa, intenta DB; si no, usa la nueva
            empresa = (empresa_nombre_nueva or "").strip()
            if id_empresa_resuelto:
                raw_empresa_db = empresas_model.get_empresa_by_id(id_empresa=int(id_empresa_resuelto))
                if not raw_empresa_db:
                    raise HTTPException(status_code=400, detail="Empresa no encontrada (id_empresa inválido)")
                empresa = (raw_empresa_db.get("nombre") or empresa_nombre_nueva or "").strip()

            raw_id_autoridad = payload_dict.get("id_autoridad")
            id_autoridad = int(raw_id_autoridad) if raw_id_autoridad not in (None, "", "null") else None

            autoridad = autoridades_model.get_autoridad_by_code(id_autoridad) if id_autoridad else None

            id_ciudad = payload_dict.get("id_ciudad")

            title = f"Audiencia {solicitante} vs {empresa}".strip()
            if title == "Audiencia vs":
                title = "Audiencia"

            nombre_aut = (autoridad or {}).get("nombre_autoridad") or "N/A"

            desc = (
                f"Audiencia con expediente: {exp_format} programada para el {aud_dt.strftime('%Y-%m-%d')} "
                f"a las {aud_dt.strftime('%H:%M')}. "
                f"Lugar/Autoridad: {nombre_aut}. "
                f"Favor de presentarse conforme a indicaciones del expediente."
            )

            agenda_payload = {
                "start_at": aud_dt,
                "end_at": end_dt,
                "title": title,
                "source_table": "conciliacion",
                "all_day": 0,
                "status": "active",
                "location": nombre_aut,
                "description": desc,
                "source_id": new_id,
                "ciudad_id": id_ciudad,
                "reminder": "15m",
                "url": f"/materias/laboral/centro-conciliacion/{new_id}",
                "in_person": 1,
                "recurrence": None,
            }

            agenda_row = agenda_model.create_agenda_conn(
                conn,
                user_id,
                1,
                agenda_payload,
            )
            id_agenda = agenda_row.get("id_agenda") or agenda_row.get("id")
            if not id_agenda:
                raise ValueError("No se pudo obtener id_agenda del evento recién creado")

            conciliacion_model.set_conciliacion_id_agenda_conn(
                conn,
                id_conciliacion=new_id,
                id_agenda=int(id_agenda),
                id_user=user_id,
            )

            conn.commit()

            if files:
                _save_files_for_conciliacion(
                    files,
                    id_conciliacion=new_id,
                    id_user=user_id,
                    conn=conn,
                )

            await manager.broadcast_json({
                "type": "AGENDA_INVALIDATE",
                "source": "conciliacion",
                "id_conciliacion": new_id,
                "id_agenda": int(id_agenda),
                "ciudad_id": id_ciudad,
            })
            await manager.broadcast_json({
                "type": "NOTIFICACION_INVALIDATE",
                "source": "conciliacion",
                "id_conciliacion": new_id,
                "descripcion_notificacion": data_create["descripcion_notificacion"],
               
            })

            print("about to broadcast, clients:", len(manager.active))

        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()

    item = conciliacion_model.get_conciliacion_by_id(new_id)
    return {"id": new_id, "item": item}

@router.get("")
def list_conciliaciones(
    expediente: Optional[str] = Query(None),
    id_status: Optional[int] = Query(None),
    id_ciudad: Optional[int] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    rfc_patron: Optional[str] = Query(None),
    abogado_contrario: Optional[str] = Query(None),
    active: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(None, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return conciliacion_model.list_conciliacion(
        expediente=expediente,
        id_status=id_status,
        id_ciudad=id_ciudad,
        date_from=date_from,
        date_to=date_to,
        rfc_patron=rfc_patron,
        abogado_contrario=abogado_contrario,
        active=active,
        search=search,
        limit=limit,
        offset=offset,
    )
@router.get("/search", response_model=List[Dict[str, Any]])
def search_expedientes(
    q: str = Query(..., min_length=1, description="Texto a buscar en expediente/expediente_format"),
    limit: int = Query(10, ge=1, le=50),
):
    """
    Búsqueda simple de expedientes por:
    - expediente
    - expediente_format

    Devuelve una lista de diccionarios que el frontend usa para el AutoComplete.
    """
    q_like = f"%{q.strip()}%"

    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            sql = """
                SELECT
                    c.expediente,
                    c.expediente_format
                  
                  
        
                 
                FROM conciliacion c
                WHERE
                    (c.expediente_format LIKE %s)
                    AND c.active = 1
                ORDER BY c.created_at DESC
                LIMIT %s
            """
            cur.execute(sql, (q_like, limit))
            rows = cur.fetchall() or []

        # Normalizar nombres de campos para que hagan match con el frontend
        results: List[Dict[str, Any]] = []
        for r in rows:
            results.append(
                {
                    "expediente": r.get("expediente"),
                    "expediente_format": r.get("expediente_format"),
               
                }
            )

        return results

    except Exception as e:
        # Loguea el error en tu logger si tienes uno
        print("Error en /expedientes/search:", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al buscar expedientes",
        )
    finally:
        conn.close()

def _fetch_agenda_raw_by_id_conn(conn, id_user: int, id_agenda: int) -> Optional[Dict[str, Any]]:
    sql = """
    SELECT
      a.id_agenda,
      a.id_user,
      a.id_ciudad,
      a.start_at,
      a.end_at,
      a.title,
      a.source_table,
      a.all_day,
      a.status,
      a.location,
      a.description,
      a.source_id,
      a.reminder,
      a.in_person,
      a.is_recurring,
      a.active
    FROM agenda a
    WHERE a.id_agenda = %s AND a.id_user = %s
    LIMIT 1
    """
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(sql, (int(id_agenda), int(id_user)))
        return cur.fetchone()
    finally:
        cur.close()


def _agenda_changed_db(old_row: Optional[Dict[str, Any]], newp: Dict[str, Any]) -> bool:
    if not old_row:
        return True

    def norm_str(x):
        return (x or "").strip()

    def norm_int(x):
        try:
            return int(x)
        except Exception:
            return 0

    # datetimes directos
    if old_row.get("start_at") != newp.get("start_at"):
        return True
    if old_row.get("end_at") != newp.get("end_at"):
        return True

    if norm_str(old_row.get("title")) != norm_str(newp.get("title")):
        return True
    if norm_str(old_row.get("status")) != norm_str(newp.get("status")):
        return True

    if norm_int(old_row.get("all_day")) != norm_int(newp.get("all_day")):
        return True

    # ciudad
    if norm_int(old_row.get("id_ciudad")) != norm_int(newp.get("ciudad_id")):
        return True

    # opcionales pero útiles si los muestras
    if norm_str(old_row.get("location")) != norm_str(newp.get("location")):
        return True
    if norm_str(old_row.get("description")) != norm_str(newp.get("description")):
        return True

    return False

@router.patch("/{id_conciliacion}")
async def actualizar_conciliacion(
    id_conciliacion: str,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")

    row = conciliacion_model.get_conciliacion_by_id(id_conciliacion)
    if not row:
        raise HTTPException(status_code=404, detail="Conciliación no encontrada")

    old_id_agenda = row.get("id_agenda")  # puede ser None

    payload_dict, files = await _parse_payload_and_files(request)
    exp_format = row.get("expediente_format") or "NO REGISTRADO"
    raw_payload = payload_dict

    # ==============================
    # Normalización (igual que create)
    # ==============================
    if "forma_notificacion" in payload_dict and "tipo_notificado" not in payload_dict:
        payload_dict["tipo_notificado"] = payload_dict.pop("forma_notificacion")

    if "origen_actuario" in payload_dict and "tipo_notificado_actuario" not in payload_dict:
        payload_dict["tipo_notificado_actuario"] = payload_dict.pop("origen_actuario")

    if "fecha_hora_cita_recepcion" in payload_dict and "fecha_notificacion" not in payload_dict:
        payload_dict["fecha_notificacion"] = payload_dict.pop("fecha_hora_cita_recepcion")

    if "medio_notificacion" in payload_dict and "id_medio_notificacion" not in payload_dict:
        payload_dict["id_medio_notificacion"] = payload_dict.pop("medio_notificacion")

    # ==============================
    # PREP: empresa (igual que create, pero OJO: debe ir en transacción)
    # ==============================
    id_empresa = raw_payload.get("id_empresa")
    empresa_nombre_nueva = (raw_payload.get("empresa_nombre_nueva") or "").strip()

    # ==============================
    # PREP: razones sociales (sin payload Pydantic, directo del raw_payload)
    # ==============================
    rs_ids_existentes = raw_payload.get("razones_sociales_ids") or []
    if not isinstance(rs_ids_existentes, list):
        rs_ids_existentes = []

    razones_nuevas_nombres = raw_payload.get("razones_sociales_nuevas") or []
    if not isinstance(razones_nuevas_nombres, list):
        razones_nuevas_nombres = []

    # ==============================
    # PREP: agenda_payload (se construye afuera, pero se aplica dentro del conn)
    # ==============================
    aud_dt = _parse_dt(raw_payload.get("fecha_audiencia"))
    if not aud_dt:
        raise HTTPException(status_code=400, detail="fecha_audiencia es obligatoria para agenda")

    end_dt = _cap_end_same_day(aud_dt)

    solicitante = (raw_payload.get("nombre_solicitante") or raw_payload.get("nombre_trabajador") or "").strip()
    raw_empresa = empresas_model.get_empresa_by_id(id_empresa=id_empresa)
    empresa_txt = (raw_empresa.get("nombre") or empresa_nombre_nueva).strip()

    raw_id_autoridad = raw_payload.get("id_autoridad")
    id_autoridad = int(raw_id_autoridad) if raw_id_autoridad not in (None, "", "null") else None
    autoridad = autoridades_model.get_autoridad_by_code(id_autoridad) if id_autoridad else None

    id_ciudad = raw_payload.get("id_ciudad") or row.get("id_ciudad")
    try:
        id_ciudad_int = int(id_ciudad) if id_ciudad not in (None, "", "null") else None
    except Exception:
        id_ciudad_int = None

    if not id_ciudad_int:
        raise HTTPException(status_code=400, detail="id_ciudad es obligatorio para agenda")

    title = f"Audiencia {solicitante} vs {empresa_txt}".strip()
    if title == "Audiencia vs":
        title = "Audiencia"

    nombre_aut = (autoridad or {}).get("nombre_autoridad") or "N/A"

    desc = (
        f"Audiencia con expediente: {exp_format} programada para el {aud_dt.strftime('%Y-%m-%d')} "
        f"a las {aud_dt.strftime('%H:%M')}. "
        f"Lugar/Autoridad: {nombre_aut}. "
        f"Favor de presentarse conforme a indicaciones del expediente."
    )

    # ==============================
    # TRANSACCIÓN ÚNICA: conciliación + historial + razones + agenda
    # ==============================
    conn = get_connection()
    new_id_agenda: Optional[int] = None
    should_ws = False
    new_expediente_format: Optional[str] = None

    try:
        try:
            conn.autocommit = False
        except Exception:
            pass

        try:
            with conn.cursor() as cur:
                cur.execute("START TRANSACTION")

            # 1) desactivar relaciones anteriores (tu regla)
            conciliacion_model.disable_conciliacion_empresas_all(
                id_conciliacion=id_conciliacion,
                id_user_updated=user_id,
                conn=conn,
            )

            # 2) resolver empresa (igual que create, pero con conn)
            if id_empresa:
                try:
                    payload_dict["id_empresa"] = int(id_empresa)
                except (ValueError, TypeError):
                    raise HTTPException(status_code=400, detail="id_empresa inválido")

            elif empresa_nombre_nueva:
                try:
                    new_id_empresa = conciliacion_model.create_empresa_from_conciliacion(
                        nombre=empresa_nombre_nueva,
                        cliente_directo=int(raw_payload.get("cliente_directo", 0)),
                        nombre_corresponsal=raw_payload.get("corresponsal_nombre"),
                        correo=raw_payload.get("corresponsal_correo"),
                        celular=raw_payload.get("corresponsal_celular"),
                        id_user_created=user_id,
                        conn=conn,
                    )
                except ValueError as e:
                    raise HTTPException(status_code=400, detail=str(e))

                payload_dict["id_empresa"] = new_id_empresa

            # 3) update conciliación básica (con conn)
            if raw_payload.get("fecha_audiencia") not in (None, "", "null"):
                payload_dict["fecha_proxima_audiencia"] = raw_payload["fecha_audiencia"]
            updated, new_expediente_format = conciliacion_model.update_conciliacion_basic(
                id_conciliacion=id_conciliacion,
                data=payload_dict,
                id_user_updated=user_id,
                conn=conn,
            )
            if updated == 0:
                raise HTTPException(status_code=404, detail="Conciliación no encontrada o sin cambios")

            # 5) razones sociales (existentes + nuevas) con conn
            id_empresa_final = payload_dict.get("id_empresa") or row.get("id_empresa")
            try:
                id_empresa_final = int(id_empresa_final) if id_empresa_final not in (None, "", "null") else None
            except Exception:
                id_empresa_final = None

            nuevos_rs_ids: List[int] = []
            if razones_nuevas_nombres:
                if not id_empresa_final:
                    raise HTTPException(
                        status_code=400,
                        detail="No se puede crear razón social nueva sin empresa asociada.",
                    )

                nuevos_rs_ids = conciliacion_model.bulk_create_razones_sociales_nuevas(
                    nombres=razones_nuevas_nombres,
                    id_user_created=user_id,
                    id_empresa=id_empresa_final,
                    conn=conn,
                )

            rs_ids_ok: List[int] = []
            for x in rs_ids_existentes:
                try:
                    rs_ids_ok.append(int(x))
                except Exception:
                    pass

            all_rs_ids = sorted(set(rs_ids_ok + (nuevos_rs_ids or [])))

            if all_rs_ids and id_empresa_final:
                conciliacion_model.bulk_insert_conciliacion_empresas(
                    id_conciliacion=id_conciliacion,
                    id_empresa=id_empresa_final,
                    razones_ids=all_rs_ids,
                    id_user_created=user_id,
                    conn=conn,
                )

            # 6) agenda: SI cambió fecha/hora => active=0 viejo + crear nuevo + religa
            agenda_payload = {
                "start_at": aud_dt,
                "end_at": end_dt,
                "title": title,
                "source_table": "conciliacion",
                "all_day": 0,
                "status": "active",
                "location": nombre_aut,
                "description": desc,
                "source_id": id_conciliacion,
                "ciudad_id": id_ciudad_int,
                "reminder": "15m",
                "url": f"/materias/laboral/centro-conciliacion/{new_expediente_format}",
                "in_person": 1,
                "recurrence": None,
            }

            if old_id_agenda:
                old_row = agenda_model.get_agenda_raw_by_id_conn(conn, int(user_id), int(old_id_agenda))

                if not old_row:
                    agenda_row = agenda_model.create_agenda_conn(conn, int(user_id), 1, agenda_payload)
                    new_id_agenda = int(agenda_row.get("id") or agenda_row.get("id_agenda") or agenda_row.get("id_agenda"))
                    conciliacion_model.set_conciliacion_id_agenda_conn(
                        conn,
                        id_conciliacion=id_conciliacion,
                        id_agenda=new_id_agenda,
                        id_user=user_id,
                    )
                    should_ws = True
                else:
                    changed = agenda_model._agenda_changed_db(old_row, agenda_payload)

                    if changed:
                        rc0 = agenda_model.disable_agenda_conn(conn, int(old_id_agenda), int(user_id))

                        if rc0 == 0:
                            raise HTTPException(status_code=500, detail="No se pudo desactivar el evento de agenda anterior")

                        agenda_row = agenda_model.create_agenda_conn(conn, int(user_id), 1, agenda_payload)
                        new_id_agenda = int(agenda_row.get("id") or agenda_row.get("id_agenda") or agenda_row.get("id_agenda"))

                        conciliacion_model.set_conciliacion_id_agenda_conn(
                            conn,
                            id_conciliacion=id_conciliacion,
                            id_agenda=new_id_agenda,
                            id_user=user_id,
                        )
                        should_ws = True
                    else:
                        new_id_agenda = int(old_id_agenda)
                        should_ws = False
            else:
                agenda_row = agenda_model.create_agenda_conn(conn, int(user_id), 1, agenda_payload)
                new_id_agenda = int(agenda_row.get("id") or agenda_row.get("id_agenda") or agenda_row.get("id_agenda"))
                conciliacion_model.set_conciliacion_id_agenda_conn(
                    conn,
                    id_conciliacion=id_conciliacion,
                    id_agenda=new_id_agenda,
                    id_user=user_id,
                )
                should_ws = True

            conn.commit()

            if files:
                _save_files_for_conciliacion(
                    files,
                    id_conciliacion=id_conciliacion,
                    id_user=user_id,
                    conn=conn,
                )

        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()

    # ==============================
    # WS: después del commit y solo si cambió agenda
    # ==============================
    if should_ws:
        await manager.broadcast_json({
            "type": "AGENDA_INVALIDATE",
            "source": "conciliacion",
            "id_conciliacion": id_conciliacion,
            "id_agenda": int(new_id_agenda) if new_id_agenda else None,
            "ciudad_id": id_ciudad_int,
        })

    ef = new_expediente_format or exp_format
    item = conciliacion_model.get_conciliacion_by_id(id_conciliacion)

    return {
        "updated": 1,
        "expediente_format": ef,
        "item": item,
    }

@router.get("/{id_conciliacion}")
def get_conciliacion(
    id_conciliacion: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    row = conciliacion_model.get_conciliacion_by_id(id_conciliacion)
    if not row:
        raise HTTPException(status_code=404, detail="Conciliación no encontrada")
    return row
@router.get("/{id_conciliacion}/historia-procesal")
def get_conciliacion_historia(
    id_conciliacion: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    row = conciliacion_model.get_conciliacion_historia_procesal(id_conciliacion)
    if not row:
        raise HTTPException(status_code=404, detail="Conciliación no encontrada")
    return row

# ====== Cards (expedientes)  ——  evitar choque de ruta ======
class ExpedientesCardsRequest(BaseModel):
    status: Optional[str] = None
    ciudad: Optional[str] = None
    abogado: Optional[str] = None
    search: Optional[str] = None
    model_config = ConfigDict(extra="allow")

@router.post("/expedientes/cards")
def get_expedientes_cards_public(
    payload: ExpedientesCardsRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    return conciliacion_model._query_expedientes(
        search=payload.search,
        status=payload.status,
        ciudad=payload.ciudad,
        abogado=payload.abogado,
    )



# ====== Delete (soft) ======
@router.delete("/{id_conciliacion}")
def delete_conciliacion(
    id_conciliacion: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")
    deleted = conciliacion_model.soft_delete_conciliacion(id_conciliacion, id_user=user_id)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Conciliación no encontrada")
    return {"deleted": deleted}

# ====== Documentos (create/list/update/delete/blob) ======
class ConciliacionDocumentoUpdate(BaseModel):
    id_tipo_documento: Optional[int] = None
    model_config = ConfigDict(extra="forbid")

# ================== DOCUMENTOS ==================
class ConciliacionDocumentoUpdate(BaseModel):
    id_tipo_documento: Optional[int] = None
    model_config = ConfigDict(extra="forbid")

class DocumentoExport(BaseModel):
    id_conciliacion: int
    path: str
    nombre: Optional[str] = None

class ExportDocumentosRequest(BaseModel):
    documentos: List[DocumentoExport]
import datetime

def _fmt_date(d: any) -> str:
    if not d:
        return ""
    if isinstance(d, (datetime.date, datetime.datetime)):
        return d.strftime("%d/%m/%Y")
    try:
        dt = datetime.datetime.fromisoformat(str(d))
        return dt.strftime("%d/%m/%Y")
    except Exception:
        return str(d)


def _strip_html(html: str) -> str:
    if not html:
        return ""
    # quitar tags HTML básicos
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit
from io import BytesIO

# ----------------- Helpers de dibujo ----------------- #

def _draw_header(c, width, height):
    """Membrete ONTIVEROS & ASOCIADOS en la parte superior."""
    y = height - 50

    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2, y, "ONTIVEROS & ASOCIADOS")

    y -= 18
    c.setFont("Helvetica", 12)
    c.drawCentredString(width / 2, y, "ABOGADOS")

    # Línea horizontal
    y -= 12
    c.setLineWidth(1.5)
    c.line(20 * mm, y, width - 20 * mm, y)

    # Direcciones en dos columnas
    y -= 12
    c.setFont("Helvetica", 8)
    left_x = 25 * mm
    right_x = width - 90 * mm

    left_text = (
        'Calle "H" y Ave. Mármoles #1598 Altos\n'
        "Col. Industrial, C.P. 21010, Mexicali, Baja California\n"
        "Tel. 686 5 54 48 52\n"
        "Correo Electrónico: recepcionmxl@ontiverosyasociados.com.mx"
    )
    right_text = (
        "Calle 2 #200 Local 8, Plaza Gabriela, Comercial 83449\n"
        "San Luis Río Colorado, Sonora\n"
        "Tels. 01 (653) 534 14 02, 534 41 91 fax. 534 11 31\n"
        "Correo Electrónico: victor@ontiverosyasociados.com.mx"
    )

    text_left = c.beginText(left_x, y)
    for line in left_text.split("\n"):
        text_left.textLine(line)
    c.drawText(text_left)

    text_right = c.beginText(right_x, y)
    for line in right_text.split("\n"):
        text_right.textLine(line)
    c.drawText(text_right)

    return y - 70  # devolvemos la nueva Y de inicio de contenido


def _draw_kv_rows(
    c,
    rows,
    y,
    *,
    label_x,
    value_x,
    label_width,
    value_width,
    font_size=9,
    leading=11,
):
    """
    Dibuja filas tipo tabla: Label | Valor (multilínea).
    Devuelve la Y final después de dibujar.
    """
    for label, value in rows:
        value_str = str(value).strip() if value is not None else ""
        if value_str == "":
            value_str = "—"

        # Label
        c.setFont("Helvetica-Bold", font_size)
        c.drawString(label_x, y, f"{label}:")

        # Valor (envuelto)
        c.setFont("Helvetica", font_size)
        lines = simpleSplit(value_str, "Helvetica", font_size, value_width)

        first_line_y = y
        for idx, line in enumerate(lines):
            line_y = first_line_y - (idx * leading)
            c.drawString(value_x, line_y, line)

        # siguiente fila
        y = first_line_y - len(lines) * leading - 2

    return y

def _fmt_date(d: Any) -> str:
    if not d:
        return ""
    if isinstance(d, (dt.date, dt.datetime)):
        return d.strftime("%d/%m/%Y")
    try:
        dt2 = dt.datetime.fromisoformat(str(d))
        return dt2.strftime("%d/%m/%Y")
    except Exception:
        return str(d)

def _build_membrete_pdf(detalle: dict) -> BytesIO:
    """
    Genera un PDF con:
    - Membrete ONTIVEROS
    - Sección DATOS DEL EXPEDIENTE (tabla)
    - Sección RELACIÓN LABORAL (tabla)
    - Sección PROPUESTA DEL PATRÓN (texto envuelto)
    """

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=LETTER)
    width, height = LETTER

    # ===== 1) Encabezado / membrete =====
    y = _draw_header(c, width, height)

    left_margin = 25 * mm
    label_x = left_margin
    value_x = left_margin + 40 * mm
    label_width = 80 * mm
    value_width = width - value_x - 25 * mm

    # ==========================
    #  DATOS DEL EXPEDIENTE
    # ==========================
    c.setFont("Helvetica-Bold", 11)
    c.drawString(left_margin, y, "DATOS DEL EXPEDIENTE")
    y -= 14

    razones = detalle.get("razones_sociales") or []
    if razones:
        rs_text = "\n".join(
            f"- {r.get('razon_social')}" for r in razones if r.get("razon_social")
        )
    else:
        rs_text = "—"

    patron = detalle.get("nombre_empresa") or "—"
    ciudad = detalle.get("nombre_ciudad") or "—"
    estado = detalle.get("nombre_estado") or "—"
    ciudad_estado = f"{ciudad}, {estado}" if estado != "—" else ciudad

    fecha_emision = detalle.get("fecha_emision_expediente") or detalle.get(
        "created_at"
    )

    filas_expediente = [
        ("Expediente", detalle.get("expediente")),
        ("ID único", detalle.get("expediente_format")),
        ("Trabajador", detalle.get("nombre_trabajador")),
        ("Patrón (empresa)", patron),
        ("Razones sociales", rs_text),
        ("Objeto", detalle.get("nombre_objeto")),
        ("Ciudad / Estado", ciudad_estado),
        ("Competencia", detalle.get("nombre_competencia")),
        ("Autoridad", detalle.get("nombre_autoridad")),
        ("Estatus del expediente", detalle.get("status")),
        ("Creado por", detalle.get("nombre_usuario")),
        ("Fecha de emisión del citatorio", _fmt_date(fecha_emision)),
        ("Fecha de notificación", _fmt_date(detalle.get("fecha_notificacion"))),
        ("Forma de notificación", detalle.get("tipo_notificado")),
        ("Origen del actuario", detalle.get("tipo_notificado_actuario")),
        ("Próxima audiencia", _fmt_date_letras(detalle.get("fecha_proxima_audiencia"))),
    ]

    y = _draw_kv_rows(
        c,
        filas_expediente,
        y,
        label_x=label_x,
        value_x=value_x,
        label_width=label_width,
        value_width=value_width,
        font_size=9,
        leading=11,
    )

    # Separador
    y -= 6
    c.setLineWidth(0.5)
    c.line(left_margin, y, width - left_margin, y)
    y -= 12

  

    # ==========================
    #  PROPUESTA DEL PATRÓN
    # ==========================
    c.setFont("Helvetica-Bold", 11)
    c.drawString(left_margin, y, "PROPUESTA DEL PATRÓN")
    y -= 14

    propuesta_html = detalle.get("propuesta_patron") or ""
    propuesta_text = _strip_html(propuesta_html) or "Sin propuesta registrada"

    c.setFont("Helvetica", 9)
    max_width = width - 2 * left_margin
    lines = simpleSplit(propuesta_text, "Helvetica", 9, max_width)

    text_obj = c.beginText(left_margin, y)
    for line in lines:
        if text_obj.getY() < 30 * mm:
            # si se acaba la página, terminamos texto, nueva página y continuamos
            c.drawText(text_obj)
            c.showPage()
            # en páginas siguientes solo continuamos texto, sin repetir membrete
            text_obj = c.beginText(left_margin, height - 30 * mm)
            c.setFont("Helvetica", 9)
        text_obj.textLine(line)
    c.drawText(text_obj)

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer


@router.get("/{expediente}/export-membrete")
def export_membrete_con_checklist(
    expediente: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Genera un PDF:
      - Primera(s) página(s): membrete + datos + propuesta (ReportLab)
      - Páginas adicionales: PDF del checklist prejudicial (si existe)
    """
    try:
        detalle, checklist = conciliacion_model.get_conciliacion_export_data(expediente)
    except ValueError:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")

    # 1) PDF con membrete y datos
    base_pdf_io = _build_membrete_pdf(detalle)
    base_reader = PdfReader(base_pdf_io)

    writer = PdfWriter()
    for page in base_reader.pages:
        writer.add_page(page)

    # 2) Anexar PDF del checklist (si existe físicamente)
    if checklist and checklist.get("path"):
        conc_id = checklist["id_conciliacion"]
        filename = checklist["path"]

        # Ajusta este path a tu estructura real de archivos
        checklist_path = BASE_UPLOADS_CONCILIACIONES / str(conc_id) / filename

        if checklist_path.is_file():
            with checklist_path.open("rb") as f_ck:
                ck_reader = PdfReader(f_ck)
                for page in ck_reader.pages:
                    writer.add_page(page)

    # 3) Volcar resultado a memoria y devolverlo
    output_io = BytesIO()
    writer.write(output_io)
    output_io.seek(0)

    file_name = f"expediente_{detalle.get('expediente_format') or expediente}.pdf"

    return StreamingResponse(
        output_io,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{file_name}"'
        },
    )
@router.post("/{id_conciliacion}/documentos", status_code=201)
async def upload_conciliacion_documento(
    id_conciliacion: int = Path(...),
    payload: str = Form(...),
    documento: UploadFile = File(..., description="Archivo a subir"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")

    try:
        data = json.loads(payload)
    except Exception:
        raise HTTPException(status_code=422, detail="payload JSON inválido")

    id_conciliacion = data.get("id_conciliacion")
    id_tipo_documento = int(data.get("id_tipo_documento", 14) or 14)

    if not id_conciliacion:
        raise HTTPException(status_code=422, detail="Falta id_conciliacion en payload")
    conn = get_connection()
  
    try:
        saved = conciliacion_model.add_documento_conciliacion(
            id_conciliacion=id_conciliacion,
            id_tipo_documento=id_tipo_documento,
            filename=documento.filename,
            fileobj=documento.file,
            id_user=user_id,
            conn=conn,
        )
    finally:
        conn.close()
    return saved

@router.get("/{id_conciliacion}/documentos")
def list_conciliacion_documentos(
    id_conciliacion: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    items = conciliacion_model.list_documentos_conciliacion(id_conciliacion)
    return {"id_conciliacion": id_conciliacion, "count": len(items), "items": items}

@router.patch("/documentos/{id_conciliacion_documentos}")
def update_conciliacion_documento(
    id_conciliacion_documentos: int,
    payload: ConciliacionDocumentoUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")

    updated = conciliacion_model.update_documento_conciliacion(
        id_conciliacion_documentos=id_conciliacion_documentos,
        id_tipo_documento=payload.id_tipo_documento,
        id_user=user_id,
    )
    if updated == 0:
        raise HTTPException(status_code=404, detail="Documento no encontrado o sin cambios")
    return {"updated": updated}

@router.post(
    "/documentos/export",
    response_class=StreamingResponse,
    summary="Exportar documentos de conciliación en un ZIP",
)
async def exportar_documentos_zip(
    payload: ExportDocumentosRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    if not payload.documentos:
        raise HTTPException(
            status_code=400, detail="No se enviaron documentos para exportar."
        )

    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
        for doc in payload.documentos:
            file_path = (
                BASE_UPLOADS_CONCILIACIONES
                / str(doc.id_conciliacion)
                / doc.path
            )

            if not file_path.is_file():
                continue

            # nombre “bonito” + extensión original
            ext = file_path.suffix  # ".pdf", ".docx", etc.
            if doc.nombre:
                arcname = f"{doc.nombre}{ext}"
            else:
                arcname = file_path.name

            zipf.write(file_path, arcname=arcname)

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="documentos_conciliacion.zip"'
        },
    )

@router.delete("/documentos/{id_conciliacion_documentos}")
def delete_conciliacion_documento(
    id_conciliacion_documentos: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")
    deleted = conciliacion_model.soft_delete_documento_conciliacion(
        id_conciliacion_documentos=id_conciliacion_documentos,
        id_user=user_id,
    )
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return {"deleted": deleted}

@router.get("/{id_conciliacion}/documentos/{filename}")
def get_conciliacion_documento_blob(
    id_conciliacion: int,
    filename: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    path = conciliacion_model.resolve_document_path(id_conciliacion=id_conciliacion, filename=filename)
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return FileResponse(str(path), media_type="application/octet-stream", filename=filename, content_disposition_type="inline")


@router.get("/{id_conciliacion}/audiencias")
def listar_audiencias(
    id_conciliacion: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    items = conciliacion_model.list_audiencias_by_conciliacion(id_conciliacion)
    return {"id_conciliacion": id_conciliacion, "count": len(items), "items": items}

@router.get("/audiencias/{id_conciliacion_audiencia}")
def obtener_audiencia(
    id_conciliacion_audiencia: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    row = conciliacion_model.get_audiencia(id_conciliacion_audiencia)
    if not row:
        raise HTTPException(status_code=404, detail="Audiencia no encontrada")
    return row

