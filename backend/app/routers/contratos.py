from __future__ import annotations
from typing import Any, Dict, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
import json
import re
import shutil
from pathlib import Path as FsPath
from ..realtime.ws_manager import manager

from fastapi import status
from ..deps import get_current_user
from ..models import contratos as contrato_model
from ..models import agenda as agenda_model
from ..models import audit as audit_model
from ..db import get_connection
import datetime as dt

CONTRATO_MODULO = 2


def _log_audit(
    action: str,
    message: str,
    id_contrato: int,
    user_id: int,
    changes=None,
    extra=None,
    request: Optional[Request] = None,
):
    """Registra una entrada en audit_log para acciones sobre contratos. No bloquea."""
    try:
        ip_address: Optional[str] = None
        user_agent: Optional[str] = None
        if request is not None:
            forwarded_for = request.headers.get("x-forwarded-for")
            if forwarded_for:
                ip_address = forwarded_for.split(",")[0].strip()
            elif request.client:
                ip_address = request.client.host
            user_agent = request.headers.get("user-agent")
        print("7")
        audit_model.create_audit_log(data={
            "action": action,
            "message": message,
            "id_user": user_id,
            "id_modulo": CONTRATO_MODULO,
            "id_key": str(id_contrato),
            "changes": changes,
            "extra": extra,
            "ip_address": ip_address,
            "user_agent": user_agent,
        })
    except Exception:
        pass

router = APIRouter(prefix="/contratos", tags=["contratos"])
BASE_UPLOADS_CONTRATOS = FsPath("uploads/contratos")


# ================== MODELOS ==================

class ContratoCreate(BaseModel):
    cliente_nombre: str
    domicilio: Optional[str] = None
    celular: Optional[str] = None
    fecha_evento: Any = None
    lugar_evento: Optional[str] = None
    hora_inicio: Any = None   # puede llegar como str "HH:MM" o datetime ya combinado
    hora_final: Any = None
    importe: Optional[str] = None
    fecha_anticipo: Optional[str] = None
    importe_anticipo: Optional[str] = None
    id_tipo_evento: Optional[int] = None
    id_ciudad: Optional[int] = None
    comentarios: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class ContratoUpdate(BaseModel):
    cliente_nombre: Optional[str] = None
    domicilio: Optional[str] = None
    fecha_evento: Optional[str] = None
    lugar_evento: Optional[str] = None
    hora_inicio: Optional[str] = None
    hora_final: Optional[str] = None
    importe: Optional[str] = None
    fecha_anticipo: Optional[str] = None
    importe_anticipo: Optional[str] = None
    comentarios: Optional[str] = None

    model_config = ConfigDict(extra="forbid")


class ContratoCardsReq(BaseModel):
    cliente_nombre: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    active: Optional[int] = 1
    search: Optional[str] = None


# ================== HELPERS ==================

async def _parse_payload_and_files(request: Request) -> Tuple[Dict[str, Any], list]:
    """
    Soporta multipart/form-data (campo 'payload' JSON + archivos) y application/json.
    """
    content_type = (request.headers.get("content-type") or "").lower()
    files = []
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

        for key, value in form.multi_items():
            if hasattr(value, "filename") and value.filename:
                files.append((key, value))
    else:
        try:
            payload_dict = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="JSON inválido")

    return payload_dict, files


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


def _combine_fecha_hora(fecha_str, hora_str) -> Optional[dt.datetime]:
    """
    Combina una fecha ISO ('2026-02-07T00:00:00') con una hora 'HH:MM' o 'HH:MM:SS'.
    Si hora_str ya es datetime completo, lo usa directamente.
    """
    if not fecha_str:
        return None
    base = _parse_dt(fecha_str)
    if base is None:
        return None
    if not hora_str:
        return base
    h = str(hora_str).strip()
    # si es solo HH:MM o HH:MM:SS combinar con la fecha base
    if re.match(r"^\d{1,2}:\d{2}(:\d{2})?$", h):
        parts = h.split(":")
        hour = int(parts[0])
        minute = int(parts[1])
        second = int(parts[2]) if len(parts) > 2 else 0
        return base.replace(hour=hour, minute=minute, second=second, microsecond=0)
    # si ya es datetime completo parsearlo normal
    return _parse_dt(hora_str)


def _resolve_id_tipo_evento(conn, tipo_evento_str: Optional[str]) -> Optional[int]:
    """Busca id_tipo_evento por nombre en la tabla tipos_evento."""
    if not tipo_evento_str:
        return None
    with conn.cursor(dictionary=True) as cur:
        cur.execute(
            "SELECT id_tipo_evento FROM tipo_eventos WHERE nombre = %s AND active = 1 LIMIT 1",
            (tipo_evento_str.strip(),),
        )
        row = cur.fetchone()
    if row:
        return row["id_tipo_evento"]
    # Fallback: mapa hardcoded para nombres comunes
    _TIPO_FALLBACK = {
        "bodas": 1, "boda": 1,
        "xv": 2, "quince": 2, "quinceañera": 2, "quinceañeros": 2,
        "graduación": 3, "graduacion": 3, "graduaciones": 3,
        "corporativo": 4, "empresa": 4,
        "cumpleaños": 5, "cumpleanos": 5,
        "otro": 6, "otros": 6,
    }
    return _TIPO_FALLBACK.get(tipo_evento_str.strip().lower())


_CIUDAD_REVERSE = {
    "san luis rio colorado": 1, "san luis": 1, "slrc": 1,
    "mexicali": 2,
    "puerto peñasco": 3, "peñasco": 3, "puerto penasco": 3,
}


def _resolve_id_ciudad(ciudad_str: str) -> Optional[int]:
    return _CIUDAD_REVERSE.get(ciudad_str.strip().lower())


def _parse_excel_date(val) -> Optional[dt.date]:
    if val is None:
        return None
    if isinstance(val, dt.datetime):
        return val.date()
    if isinstance(val, dt.date):
        return val
    s = str(val).strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
        try:
            return dt.datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def _parse_excel_time(val) -> Optional[str]:
    if val is None:
        return None
    if isinstance(val, dt.time):
        return val.strftime("%H:%M")
    if isinstance(val, dt.datetime):
        return val.strftime("%H:%M")
    s = str(val).strip()
    if not s:
        return None
    import re as _re
    if _re.match(r"^\d{1,2}:\d{2}", s):
        return s[:5]
    return None


def _cap_end_same_day(start_dt: dt.datetime) -> dt.datetime:
    end_dt = start_dt + dt.timedelta(hours=1)
    if end_dt.date() != start_dt.date():
        return start_dt.replace(hour=23, minute=59, second=0, microsecond=0)
    return end_dt


# ================== ENDPOINTS ==================

@router.post("", status_code=201)
async def crear_contrato(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")

    payload_dict, _ = await _parse_payload_and_files(request)

    # Combinar fecha_evento + hora_inicio/hora_final ANTES de validar y guardar
    fecha_base = payload_dict.get("fecha_evento")
    start_dt = _combine_fecha_hora(fecha_base, payload_dict.get("hora_inicio"))
    if not start_dt:
        raise HTTPException(status_code=400, detail="fecha_evento es obligatorio")

    end_dt = _combine_fecha_hora(fecha_base, payload_dict.get("hora_final"))
    if not end_dt:
        end_dt = _cap_end_same_day(start_dt)
    # si hora_final < hora_inicio → el evento cruza medianoche, sumar 1 día
    elif end_dt <= start_dt:
        end_dt += dt.timedelta(days=1)

    # reemplazar los strings por datetimes completos para que el modelo los guarde bien
    payload_dict["hora_inicio"] = start_dt
    payload_dict["hora_final"] = end_dt

    conn = get_connection()

    # Resolver id_tipo_evento: si el front manda el string "tipo_evento", hacer lookup
    if not payload_dict.get("id_tipo_evento") and payload_dict.get("tipo_evento"):
        payload_dict["id_tipo_evento"] = _resolve_id_tipo_evento(conn, payload_dict["tipo_evento"])

    allowed_fields = ContratoCreate.model_fields.keys()
    basic_data = {k: v for k, v in payload_dict.items() if k in allowed_fields}
    payload = ContratoCreate(**basic_data)
    new_id: Optional[int] = None
    print(payload)

    try:
        try:
            conn.autocommit = False
        except Exception:
            pass

        try:
            with conn.cursor() as cur:
                cur.execute("START TRANSACTION")

            # 1) crear contrato
            result = contrato_model.create_contrato(
                data=payload.model_dump(exclude_none=True),
                id_user_created=user_id,
                conn=conn,
            )
            new_id = result["id_contrato"]
            code = result["code"]

            # 2) evento en agenda (datetimes ya combinados)

            lugar = (payload_dict.get("lugar_evento") or "").strip()
            cliente = (payload_dict.get("cliente_nombre") or "").strip()
            title = f"Contrato {cliente}".strip() if cliente else "Contrato"

            desc = (
                f"Contrato {code} para {cliente}. "
                f"Evento el {start_dt.strftime('%Y-%m-%d')} de {start_dt.strftime('%H:%M')} "
                f"a {end_dt.strftime('%H:%M')}. Lugar: {lugar}."
            )

            id_ciudad = payload_dict.get("id_ciudad")
            id_agenda_evento = payload.id_tipo_evento or 1

            agenda_payload = {
                "start_at": start_dt,
                "end_at": end_dt,
                "title": title,
                "source_table": "contratos",
                "all_day": 0,
                "status": "active",
                "location": lugar,
                "description": desc,
                "source_id": new_id,
                "ciudad_id": id_ciudad,
                "reminder": "15m",
                "url": f"/contratos/{new_id}",
                "in_person": 1,
                "recurrence": None,
            }

            agenda_row = agenda_model.create_agenda_conn(conn, user_id, id_agenda_evento, agenda_payload)
            id_agenda = agenda_row.get("id_agenda") or agenda_row.get("id")
            if not id_agenda:
                raise ValueError("No se pudo obtener id_agenda")

            conn.commit()

        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()

    await manager.broadcast_json({
        "type": "AGENDA_INVALIDATE",
        "source": "contratos",
        "id_contrato": new_id,
        "id_agenda": int(id_agenda),
        "ciudad_id": id_ciudad,
    })

    _log_audit(
        "CREATE",
        f"Contrato creado para {payload.cliente_nombre}",
        new_id,
        user_id,
        extra={"codigo": code},
        request=request,
    )

    item = contrato_model.get_contrato_by_id(new_id)
    return {"id": new_id, "code": code, "item": item}


@router.get("")
def list_contratos(
    cliente_nombre: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    active: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(None, ge=0),
    _current_user: Dict[str, Any] = Depends(get_current_user),
):
    return contrato_model.list_contratos(
        cliente_nombre=cliente_nombre,
        date_from=date_from,
        date_to=date_to,
        active=active,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get("/search")
def search_contratos(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
):
    q_like = f"%{q.strip()}%"
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT id_contrato, code, cliente_nombre, fecha_evento
                FROM contratos
                WHERE (code LIKE %s OR cliente_nombre LIKE %s) AND active = 1
                ORDER BY fecha_evento DESC
                LIMIT %s
                """,
                (q_like, q_like, limit),
            )
            return cur.fetchall() or []
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        conn.close()


@router.post("/cards")
def contrato_cards(
    payload: ContratoCardsReq,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    return contrato_model.cards_contrato(
        cliente_nombre=payload.cliente_nombre,
        date_from=payload.date_from,
        date_to=payload.date_to,
        active=payload.active,
        search=payload.search,
    )


@router.post("/importar-excel", status_code=200)
async def importar_excel_contratos(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    import io
    try:
        import openpyxl
    except ImportError:
        raise HTTPException(status_code=500, detail="openpyxl no está instalado en el servidor.")

    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")

    contents = await file.read()
    try:
        wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
    except Exception:
        raise HTTPException(status_code=400, detail="No se pudo leer el archivo Excel. Asegúrate de que sea .xlsx o .xls válido.")

    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    headers = [str(h).strip().lower() if h is not None else "" for h in rows[0]]
    data_rows = rows[1:]

    total = 0
    insertados = 0
    errores = 0
    errores_detalle: list = []

    conn_lookup = get_connection()

    for i, row in enumerate(data_rows, start=2):
        row_dict = {headers[j]: row[j] for j in range(min(len(headers), len(row)))}

        # Omitir filas completamente vacías
        if not any(v for v in row_dict.values() if v is not None and str(v).strip()):
            continue

        total += 1

        try:
            # ── Resolución de lookups ──────────────────────────────────
            ciudad_str = str(row_dict.get("ciudad") or "").strip()
            id_ciudad = _resolve_id_ciudad(ciudad_str) if ciudad_str else None

            tipo_str = str(row_dict.get("tipo_evento") or "").strip()
            id_tipo_evento = _resolve_id_tipo_evento(conn_lookup, tipo_str) if tipo_str else None

            # ── Parseo de fechas y horas ───────────────────────────────
            fecha_evento = _parse_excel_date(row_dict.get("fecha_evento"))
            if not fecha_evento:
                raise ValueError("fecha_evento es requerida y no se pudo leer.")

            fecha_anticipo = _parse_excel_date(row_dict.get("fecha_anticipo"))
            hora_inicio_str = _parse_excel_time(row_dict.get("hora_inicio"))
            hora_final_str = _parse_excel_time(row_dict.get("hora_final"))

            fecha_base_iso = dt.datetime.combine(fecha_evento, dt.time(0, 0)).isoformat()
            start_dt = _combine_fecha_hora(fecha_base_iso, hora_inicio_str) or dt.datetime.combine(fecha_evento, dt.time(0, 0))
            end_dt = _combine_fecha_hora(fecha_base_iso, hora_final_str)
            if not end_dt:
                end_dt = _cap_end_same_day(start_dt)
            elif end_dt <= start_dt:
                end_dt += dt.timedelta(days=1)

            # ── Construcción del payload ───────────────────────────────
            def _str(key):
                v = row_dict.get(key)
                return str(v).strip() if v is not None and str(v).strip() else None

            data = {
                "cliente_nombre": _str("cliente_nombre") or "Sin nombre",
                "domicilio": _str("domicilio"),
                "celular": _str("celular"),
                "fecha_evento": fecha_evento,
                "lugar_evento": _str("lugar_evento"),
                "hora_inicio": start_dt,
                "hora_final": end_dt,
                "importe": _str("importe"),
                "fecha_anticipo": fecha_anticipo,
                "importe_anticipo": _str("importe_anticipo"),
                "id_tipo_evento": id_tipo_evento,
                "comentarios": _str("comentarios"),
            }

            # ── Insertar ───────────────────────────────────────────────
            conn = get_connection()
            try:
                conn.autocommit = False
                with conn.cursor() as cur:
                    cur.execute("START TRANSACTION")

                result = contrato_model.create_contrato(data=data, id_user_created=int(user_id), conn=conn)
                new_id = result["id_contrato"]

                if id_ciudad:
                    with conn.cursor() as cur:
                        cur.execute("UPDATE contratos SET id_ciudad = %s WHERE id_contrato = %s", (id_ciudad, new_id))

                conn.commit()
                insertados += 1

            except Exception as e:
                conn.rollback()
                raise e
            finally:
                conn.close()

        except Exception as exc:
            errores += 1
            if len(errores_detalle) < 20:
                errores_detalle.append({"fila": i, "error": str(exc)})

    try:
        conn_lookup.close()
    except Exception:
        pass

    return {
        "total": total,
        "insertados": insertados,
        "errores": errores,
        "errores_detalle": errores_detalle,
    }


@router.get("/{id_contrato}")
def get_contrato(
    id_contrato: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    row = contrato_model.get_contrato_by_id(id_contrato)
    if not row:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    return row


@router.patch("/{id_contrato}")
async def actualizar_contrato(
    id_contrato: int,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")

    row = contrato_model.get_contrato_by_id(id_contrato)
    if not row:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")

    old_id_agenda = row.get("id_agenda")

    payload_dict, _ = await _parse_payload_and_files(request)

    # ── transacción ──────────────────────────────────────────────
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

            # Combinar fecha+hora ANTES de actualizar para que la BD reciba datetime completo
            fecha_base = payload_dict.get("fecha_evento") or row.get("fecha_evento")
            start_dt = _combine_fecha_hora(fecha_base, payload_dict.get("hora_inicio"))
            end_dt = _combine_fecha_hora(fecha_base, payload_dict.get("hora_final"))
            if start_dt:
                payload_dict["hora_inicio"] = start_dt
                if not end_dt:
                    end_dt = _cap_end_same_day(start_dt)
                elif end_dt <= start_dt:
                    end_dt += dt.timedelta(days=1)
                payload_dict["hora_final"] = end_dt

            affected, code = contrato_model.update_contrato(
                id_contrato=id_contrato,
                data=payload_dict,
                conn=conn,
            )
            if affected == 1:
                #raise HTTPException(status_code=404, detail="Contrato no encontrado o sin cambios")

                # agenda: recalcular si cambió fecha/hora
                if start_dt:
                    if not end_dt:
                        end_dt = _cap_end_same_day(start_dt)

                    lugar = (payload_dict.get("lugar_evento") or row.get("lugar_evento") or "").strip()
                    cliente = (payload_dict.get("cliente_nombre") or row.get("cliente_nombre") or "").strip()
                    title = f"Contrato {cliente}".strip() if cliente else "Contrato"
                    desc = (
                        f"Contrato {code} para {cliente}. "
                        f"Evento el {start_dt.strftime('%Y-%m-%d')} de {start_dt.strftime('%H:%M')} "
                        f"a {end_dt.strftime('%H:%M')}. Lugar: {lugar}."
                    )

                    id_ciudad = payload_dict.get("id_ciudad") or row.get("id_ciudad")
                    agenda_payload = {
                        "start_at": start_dt,
                        "end_at": end_dt,
                        "title": title,
                        "source_table": "contratos",
                        "all_day": 0,
                        "status": "active",
                        "location": lugar,
                        "description": desc,
                        "source_id": id_contrato,
                        "ciudad_id": id_ciudad,
                        "reminder": "15m",
                        "url": f"/contratos/{id_contrato}",
                        "in_person": 1,
                        "recurrence": None,
                    }

                    if old_id_agenda:
                        old_row = agenda_model.get_agenda_raw_by_id_conn(conn, int(user_id), int(old_id_agenda))
                        changed = agenda_model._agenda_changed_db(old_row, agenda_payload) if old_row else True

                        if changed:
                            agenda_model.disable_agenda_conn(conn, int(old_id_agenda), int(user_id))
                            agenda_row = agenda_model.create_agenda_conn(conn, int(user_id), 1, agenda_payload)
                            new_id_agenda = int(agenda_row.get("id") or agenda_row.get("id_agenda"))
                            should_ws = True
                        else:
                            new_id_agenda = int(old_id_agenda)
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

    if should_ws:
        await manager.broadcast_json({
            "type": "AGENDA_INVALIDATE",
            "source": "contratos",
            "id_contrato": id_contrato,
            "id_agenda": new_id_agenda,
        })
    print(id_contrato)

    _log_audit(
        "UPDATE",
        "Contrato actualizado",
        id_contrato,
        user_id,
        changes={k: v for k, v in payload_dict.items() if k not in ("hora_inicio", "hora_final")},
        request=request,
    )
    print("pasaste")

    item = contrato_model.get_contrato_by_id(id_contrato)
    return {"updated": 1, "code": code, "item": item}


class AbonoCreate(BaseModel):
    monto: str
    fecha: str
    descripcion: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


@router.get("/{id_contrato}/pagos")
def list_contratos_abonos(
    id_contrato: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    row = contrato_model.get_contrato_by_id(id_contrato)
    if not row:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    return contrato_model.get_contratos_abonos(id_contrato)


@router.post("/{id_contrato}/pagos", status_code=201)
def create_abono(
    id_contrato: int,
    payload: AbonoCreate,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")

    row = contrato_model.get_contrato_by_id(id_contrato)
    if not row:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")

    try:
        fecha_dt = _parse_dt(payload.fecha)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    abono = contrato_model.create_contrato_abono(
        id_contrato=id_contrato,
        id_user=int(user_id),
        importe=payload.monto,
        fecha=fecha_dt,
    )
    _log_audit(
        "ABONO_ADD",
        f"Abono registrado por ${payload.monto}",
        id_contrato,
        int(user_id),
        changes={"monto": payload.monto, "fecha": str(fecha_dt)},
        request=request,
    )
    return abono


@router.delete("/{id_contrato}/pagos/{id_abono}", status_code=200)
def eliminar_abono(
    id_contrato: int,
    id_abono: int,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = int(current_user.get("id") or current_user.get("id_user") or 0)

    row = contrato_model.get_contrato_by_id(id_contrato)
    if not row:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")

    deleted = contrato_model.delete_contrato_abono(id_contrato=id_contrato, id_abono=id_abono)
    if not deleted:
        raise HTTPException(status_code=404, detail="Abono no encontrado")

    _log_audit(
        "ABONO_DELETE",
        f"Abono eliminado por ${deleted.get('monto', '')}",
        id_contrato,
        user_id,
        changes={"id_abono": id_abono, "monto": deleted.get("monto"), "fecha": str(deleted.get("fecha"))},
        request=request,
    )
    return {"deleted": 1, "id": id_abono}


@router.delete("/{id_contrato}", status_code=200)
def eliminar_contrato(
    id_contrato: int,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = int(current_user.get("id") or current_user.get("id_user") or 0)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE contratos SET active = 0 WHERE id_contrato = %s",
                (id_contrato,),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Contrato no encontrado")
        conn.commit()
    finally:
        conn.close()

    _log_audit("DELETE", "Contrato eliminado (marcado inactivo)", id_contrato, user_id, request=request)
    return {"deleted": 1, "id_contrato": id_contrato}


# ================== DOCUMENTOS ==================

UPLOADS_DIR = FsPath("uploads/contratos")


@router.get("/{id_contrato}/documentos")
def list_documentos(
    id_contrato: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    row = contrato_model.get_contrato_by_id(id_contrato)
    if not row:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")

    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT id_contacto_documento AS id, filename, path, id_tipo_documento, active
                FROM contratos_documentos
                WHERE id_contrato = %s AND active = 1
                ORDER BY id_contacto_documento DESC
                """,
                (id_contrato,),
            )
            return cur.fetchall() or []
    finally:
        conn.close()


@router.post("/{id_contrato}/documentos", status_code=201)
async def upload_documento(
    id_contrato: int,
    request: Request,
    file: UploadFile = File(...),
    id_tipo_documento: int = 1,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")

    row = contrato_model.get_contrato_by_id(id_contrato)
    if not row:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")

    # Estructura: uploads/contratos/{id_contrato}/{timestamp}_{nombre_original}
    dest_dir = UPLOADS_DIR / str(id_contrato)
    dest_dir.mkdir(parents=True, exist_ok=True)

    original_filename = file.filename                              # nombre original → va a filename
    safe_name  = re.sub(r"[^\w.\-]", "_", original_filename)
    timestamp  = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    stored_name = f"{timestamp}_{safe_name}"                       # nombre físico con timestamp
    dest_path  = dest_dir / stored_name

    with dest_path.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)

    rel_path = str(dest_path).replace("\\", "/")   # path de almacenamiento

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO contratos_documentos
                    (id_contrato, active, filename, path, id_user, id_tipo_documento)
                VALUES (%s, 1, %s, %s, %s, %s)
                """,
                (id_contrato, original_filename, rel_path, user_id, id_tipo_documento),
            )
            new_id = cur.lastrowid
        conn.commit()
    except Exception as e:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

    tipo_label = "contrato principal" if id_tipo_documento == 1 else "documento adicional"
    _log_audit(
        "DOCUMENTO_ADD",
        f"Documento agregado ({tipo_label}): {original_filename}",
        id_contrato,
        int(user_id),
        changes={"filename": original_filename, "id_tipo_documento": id_tipo_documento},
        request=request,
    )
    return {"id": new_id, "filename": original_filename, "path": rel_path}


@router.delete("/{id_contrato}/documentos/{id_doc}", status_code=200)
def eliminar_documento(
    id_contrato: int,
    id_doc: int,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = int(current_user.get("id") or current_user.get("id_user") or 0)
    conn = get_connection()
    filename = None
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT filename FROM contratos_documentos WHERE id_contacto_documento = %s AND id_contrato = %s LIMIT 1",
                (id_doc, id_contrato),
            )
            doc_row = cur.fetchone()
            if doc_row:
                filename = doc_row.get("filename")
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE contratos_documentos SET active = 0 WHERE id_contacto_documento = %s AND id_contrato = %s",
                (id_doc, id_contrato),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Documento no encontrado")
        conn.commit()
    finally:
        conn.close()

    _log_audit(
        "DOCUMENTO_DELETE",
        f"Documento eliminado: {filename or id_doc}",
        id_contrato,
        user_id,
        changes={"id_doc": id_doc, "filename": filename},
        request=request,
    )
    return {"deleted": 1, "id": id_doc}


# ================== ACTIVIDAD (AUDIT LOG) ==================

@router.get("/{id_contrato}/actividad")
def get_actividad_contrato(
    id_contrato: int,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    row = contrato_model.get_contrato_by_id(id_contrato)
    if not row:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")

    items, total = audit_model.list_audit_logs(
        filters={
            "id_modulo": CONTRATO_MODULO,
            "id_key": str(id_contrato),
        },
        limit=limit,
        offset=offset,
    )
    return {"items": items, "total": total}
