from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import datetime
import json
import secrets, string, shutil, hashlib, os
from ..db import get_connection
from ..models import conciliaciones as obj_conciliacion
from pathlib import Path as FsPath
from fastapi import HTTPException, UploadFile
import os, time

BASE_UPLOADS_AGENDA = FsPath("uploads/agenda")
KNOWN_CITY_IDS = [1, 2, 3, 2641]

# ============================================================
# Helpers de mapeo (DB row -> API)
# ============================================================


def _row_to_api(row: Dict[str, Any]) -> Dict[str, Any]:
    if not row:
        return {}

    recurrence = None
    rule_raw = row.get("rule_json")
    if rule_raw:
        try:
            recurrence = json.loads(rule_raw)
        except Exception:
            recurrence = None

    return {
        "id": row.get("id_agenda"),
        "id_agenda_evento": row.get("id_agenda_evento"),
        "start": row.get("start_at").isoformat() if row.get("start_at") else None,
        "url": row.get("url"),
        "end": row.get("end_at").isoformat() if row.get("end_at") else None,
        "title": row.get("title") or "",
        "allDay": bool(row.get("all_day")) if row.get("all_day") is not None else False,
        "status": row.get("status"),
        "location": row.get("location") or "",
        "description": row.get("description") or "",
        "source_table": row.get("source_table") or None,
        "source_id": row.get("source_id"),
        "ciudad_id": row.get("id_ciudad"),  # <- consistente

        "nombre_ciudad": row.get("nombre_ciudad") or None,
        "color_hex": row.get("color_hex") or None,
        "contrato_tipo_id": row.get("contrato_tipo_id"),

        "reminder": row.get("reminder"),
        "inPerson": bool(row.get("in_person")) if row.get("in_person") is not None else False,
        "is_recurring": bool(row.get("is_recurring")) if row.get("is_recurring") is not None else False,
        "active": int(row.get("active")) if row.get("active") is not None else 1,

        # este campo es puro UI tuyo; lo dejo igual
        "datetime": "now()",

        "recurrence": recurrence,
    }


def _get_active_recurrence(conn, id_agenda: int) -> Optional[Dict[str, Any]]:
    sql = """
    SELECT id_recurrence, id_agenda, rule_json, until, active
    FROM agenda_recurrence
    WHERE id_agenda = %s AND active = 1
    ORDER BY id_recurrence DESC
    LIMIT 1
    """
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(sql, (id_agenda,))
        return cur.fetchone()
    finally:
        cur.close()

def create_agenda_with_document(
    *,
    id_user: int,
    id_agenda_evento: int,
    payload: Dict[str, Any],
    documento: UploadFile | None,
) -> Dict[str, Any]:
    conn = get_connection()
    try:
        row = create_agenda_conn(conn=conn, id_user=id_user, id_agenda_evento=id_agenda_evento, payload=payload)

        id_agenda = row.get("id_agenda") or row.get("id")
        if not id_agenda:
            raise ValueError("No se pudo obtener id_agenda del evento recién creado")

        if documento:
            _save_documento_agenda(
                id_agenda=int(id_agenda),
                filename=documento.filename or "documento",
                fileobj=documento.file,
                conn=conn,          # MISMA conexión
            )

        conn.commit()

        refreshed = get_agenda_by_id_conn(conn, id_user, int(id_agenda))
        return refreshed or row
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
# ============================================================
# SELECTs
# ============================================================

def _get_user_city_flags(conn, id_user: int):
    sql = """
    SELECT
      COALESCE(otros_despachos, 0)   AS otros_despachos,
      COALESCE(cualquier_despacho, 0) AS cualquier_despacho
    FROM users
    WHERE id_user = %s
    LIMIT 1
    """
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(sql, (id_user,))
        r = cur.fetchone() or {}
        return bool(r["otros_despachos"]), bool(r["cualquier_despacho"])
    finally:
        cur.close()


def _get_allowed_city_ids_from_despachos(conn, id_user: int):
    sql = """
    SELECT DISTINCT d.id_ciudad
    FROM users_despachos ud
    JOIN despachos d ON d.id_despacho = ud.id_despacho
    WHERE ud.id_user = %s
      AND ud.active = 1
      AND ud.consultar = 1
      AND d.active = 1
      AND d.id_ciudad IS NOT NULL
    """
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(sql, (id_user,))
        return [int(r["id_ciudad"]) for r in (cur.fetchall() or [])]
    finally:
        cur.close()

def list_agenda(
    id_user: int,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    status: Optional[str] = None,
    include_inactive: bool = False,
):
    conn = get_connection()
    try:
        where = []
        params = []

        if date_from:
            where.append("a.end_at >= %s")
            params.append(date_from)

        if date_to:
            where.append("a.start_at <= %s")
            params.append(date_to)

        if status:
            where.append("a.status = %s")
            params.append(status)

        if not include_inactive:
            where.append("a.active = 1")

        sql = f"""
                SELECT
                a.id_agenda, a.id_agenda_evento, a.url,
                a.start_at, a.end_at, a.id_user, a.title,
                a.source_table, a.all_day, a.status,
                a.location, a.description, a.source_id,
                a.active, a.datetime, a.id_ciudad,
                c.nombre AS nombre_ciudad, c.color_hex,
                a.reminder, a.in_person, a.is_recurring,
                ar.rule_json, ar.until AS rec_until,

                ad.filename AS documento_filename,
                CASE
                    WHEN ad.filename IS NULL THEN NULL
                    ELSE CONCAT('/uploads/agenda/', a.id_agenda, '/', ad.filename)
                END AS documento_url
                FROM agenda a
                LEFT JOIN agenda_recurrence ar
                ON ar.id_agenda = a.id_agenda AND ar.active = 1
                LEFT JOIN ciudades c ON c.id_ciudad = a.id_ciudad
                LEFT JOIN (
                SELECT d1.*
                FROM agenda_documentos d1
                INNER JOIN (
                    SELECT id_agenda, MAX(id_agenda_documento) AS max_id
                    FROM agenda_documentos
                    WHERE active = 1
                    GROUP BY id_agenda
                ) x ON x.id_agenda = d1.id_agenda AND x.max_id = d1.id_agenda_documento
                ) ad ON ad.id_agenda = a.id_agenda
                WHERE {" AND ".join(where)}
                ORDER BY a.start_at ASC
                """

        cur = conn.cursor(dictionary=True)
        try:
            cur.execute(sql, params)
            return [_row_to_api(r) for r in (cur.fetchall() or [])]
        finally:
            cur.close()
    finally:
        conn.close()

def list_agenda_post(
    id_user: int,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    status: Optional[str] = None,
    include_inactive: bool = False,
    city_ids: Optional[List[int]] = None,
    include_other_cities: bool = False,
    event_type_ids: Optional[List[int]] = None,
    contrato_tipo_ids: Optional[List[int]] = None,
):
    conn = get_connection()
    try:

        where = []
        params = []

        if date_from:
            where.append("a.end_at >= %s")
            params.append(date_from)

        if date_to:
            where.append("a.start_at <= %s")
            params.append(date_to)

        if status:
            where.append("a.status = %s")
            params.append(status)

        if not include_inactive:
            where.append("a.active = 1")

        if event_type_ids:
            ph = ",".join(["%s"] * len(event_type_ids))
            where.append(f"a.id_agenda_evento IN ({ph})")
            params.extend(event_type_ids)

        # Filtro por ciudad
        city_ids = city_ids or []
        if city_ids:
            ph = ",".join(["%s"] * len(city_ids))
            where.append(f"(a.id_ciudad IN ({ph}) OR a.id_ciudad IS NULL)")
            params.extend(city_ids)

        # Filtro por tipo de contrato (join con contratos via source_id)
        if contrato_tipo_ids:
            ph = ",".join(["%s"] * len(contrato_tipo_ids))
            where.append(f"""(
                a.source_table != 'contratos'
                OR a.source_id IS NULL
                OR EXISTS (
                    SELECT 1 FROM contratos co
                    WHERE co.id_contrato = a.source_id
                    AND co.id_tipo_evento IN ({ph})
                )
            )""")
            params.extend(contrato_tipo_ids)

        where_sql = " AND ".join(where) if where else "1=1"

        sql = f"""
            SELECT
            a.id_agenda, a.id_agenda_evento, a.url,
            a.start_at, a.end_at, a.id_user, a.title,
            a.source_table, a.all_day, a.status,
            a.location, a.description, a.source_id,
            a.active, a.datetime, a.id_ciudad,
            c.nombre AS nombre_ciudad, c.color_hex,
            a.reminder, a.in_person, a.is_recurring,
            ar.rule_json, ar.until AS rec_until,
            co.id_tipo_evento AS contrato_tipo_id,
            ad.filename AS documento_filename,
            CASE
                WHEN ad.filename IS NULL THEN NULL
                ELSE CONCAT('/uploads/agenda/', a.id_agenda, '/', ad.filename)
            END AS documento_url
            FROM agenda a
            LEFT JOIN agenda_recurrence ar ON ar.id_agenda = a.id_agenda AND ar.active = 1
            LEFT JOIN ciudades c ON c.id_ciudad = a.id_ciudad
            LEFT JOIN contratos co ON co.id_contrato = a.source_id AND a.source_table = 'contratos'
            LEFT JOIN (
            SELECT d1.*
            FROM agenda_documentos d1
            INNER JOIN (
                SELECT id_agenda, MAX(id_agenda_documento) AS max_id
                FROM agenda_documentos
                WHERE active = 1
                GROUP BY id_agenda
            ) x ON x.id_agenda = d1.id_agenda AND x.max_id = d1.id_agenda_documento
            ) ad ON ad.id_agenda = a.id_agenda
            WHERE {where_sql}
            ORDER BY a.start_at ASC
"""

        cur = conn.cursor(dictionary=True)
        try:
            cur.execute(sql, params)
            return [_row_to_api(r) for r in (cur.fetchall() or [])]
        finally:
            cur.close()
    finally:
        conn.close()
def _row_to_api(r: dict) -> dict:
    r = dict(r or {})
    r["documento_filename"] = r.get("documento_filename")
    r["documento_url"] = r.get("documento_url")
    return r
def get_agenda_raw_by_id_conn(conn, id_user: int, id_agenda: int) -> Optional[Dict[str, Any]]:
    """
    Row crudo (DB) para comparaciones. NO mapea a API.
    NO cierra conn. NO commit/rollback.
    """
    sql = """
    SELECT
      a.id_agenda,
      a.id_agenda_evento,
      a.start_at,
      a.url,
      a.end_at,
      a.id_user,
      a.title,
      a.source_table,
      a.all_day,
      a.status,
      a.location,
      a.description,
      a.source_id,
      a.active,
      a.datetime,
      a.id_ciudad,
      a.reminder,
      a.in_person,
      a.is_recurring
    FROM agenda a
    WHERE a.id_agenda = %s
    LIMIT 1
    """
    cur = conn.cursor(dictionary=True)
    try:
        print(sql)
        print(id_agenda)
        cur.execute(sql, (int(id_agenda),))
        return cur.fetchone()
    finally:
        cur.close()


def get_agenda_by_id(id_user: int, id_agenda: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        row = get_agenda_by_id_conn(conn, id_user, id_agenda)
        return row
    finally:
        conn.close()
def get_agenda_by_id_conn(conn, id_user: int, id_agenda: int) -> dict | None:
    with conn.cursor(dictionary=True) as cur:
        cur.execute(
            """
            SELECT
              a.id_agenda,
              a.id_agenda_evento,
              a.start_at,
              a.end_at,
              a.id_user,
              a.title,
              a.source_table,
              a.all_day,
              a.status,
              a.location,
              a.description,
              a.source_id,
              a.active,
              a.datetime,
              a.id_ciudad,
              a.reminder,
              a.in_person,
              a.is_recurring,
              a.url,

              ad.filename AS documento_filename,
              CASE
                WHEN ad.filename IS NULL THEN NULL
                ELSE CONCAT('/uploads/agenda/', a.id_agenda, '/', ad.filename)
              END AS documento_url
            FROM agenda a
            LEFT JOIN (
              SELECT d1.*
              FROM agenda_documentos d1
              INNER JOIN (
                SELECT id_agenda, MAX(id_agenda_documento) AS max_id
                FROM agenda_documentos
                WHERE active = 1
                GROUP BY id_agenda
              ) x ON x.id_agenda = d1.id_agenda AND x.max_id = d1.id_agenda_documento
            ) ad ON ad.id_agenda = a.id_agenda
            WHERE a.id_agenda = %s AND a.id_user = %s
            """,
            (id_agenda, id_user),
        )
        return cur.fetchone()

def _update_agenda_core_conn(conn, id_agenda: int, id_user: int, payload: Dict[str, Any]) -> int:
    """
    Update directo (sin tocar agenda_model). Mantiene id_ciudad (col real) y el resto.
    """
    sql = """
    UPDATE agenda
    SET
      start_at = %s,
      end_at = %s,
      title = %s,
      source_table = %s,
      all_day = %s,
      status = %s,
      location = %s,
      description = %s,
      source_id = %s,
      id_ciudad = %s,
      reminder = %s,
      in_person = %s,
      is_recurring = %s,
      id_user_updated = %s,
      updated_at = NOW()
    WHERE id_agenda = %s 
    LIMIT 1
    """
    params = (
        payload.get("start_at"),
        payload.get("end_at"),
        payload.get("title"),
        payload.get("source_table"),
        int(payload.get("all_day") or 0),
        payload.get("status"),
        payload.get("location"),
        payload.get("description"),
        payload.get("source_id"),
        payload.get("ciudad_id"),
        payload.get("reminder") or "15m",
        int(payload.get("in_person") or 0),
        1 if payload.get("recurrence") else 0,
        int(id_user),
        int(id_agenda),
    
    )
    cur = conn.cursor()
    try:
        cur.execute(sql, params)
        return cur.rowcount
    finally:
        cur.close()


def _upsert_recurrence(conn, id_agenda: int, recurrence: Any) -> None:
    """
    Upsert de recurrencia usando una conexión existente.
    NO cierra conn. NO hace commit/rollback.
    """
    rec_json = json.dumps(recurrence, ensure_ascii=False, default=str)

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1
            FROM agenda_recurrence
            WHERE id_agenda = %s
            LIMIT 1
            """,
            (int(id_agenda),),
        )
        exists = cur.fetchone() is not None

        if exists:
            cur.execute(
                """
                UPDATE agenda_recurrence
                SET rule_json = %s,
                    updated_at = NOW()
                WHERE id_agenda = %s
                """,
                (rec_json, int(id_agenda)),
            )
        else:
            cur.execute(
                """
                INSERT INTO agenda_recurrence
                    (id_agenda, rule_json, created_at, updated_at)
                VALUES
                    (%s, %s, NOW(), NOW())
                """,
                (int(id_agenda), rec_json),
            )



def _remove_recurrence(conn, id_agenda: int) -> None:
    cur = conn.cursor()
    try:
        cur.execute("UPDATE agenda_recurrence SET active = 0 WHERE id_agenda = %s", (id_agenda,))
    finally:
        cur.close()
def disable_agenda_conn(conn, id_agenda: int, id_user: int) -> int:
    """
    Desactiva un evento de agenda (active=0) usando una conexión existente.
    NO cierra conn. NO hace commit/rollback.
    """
    sql = """
    UPDATE agenda
    SET
      active = 0,
      id_user = %s,
      datetime = NOW()
    WHERE id_agenda = %s 
    LIMIT 1
    """
    cur = conn.cursor()
    try:
        cur.execute(sql, (int(id_user), int(id_agenda),))
        return cur.rowcount
    finally:
        cur.close()


# ============================================================
# Create
# ============================================================

def create_agenda(id_user: int, id_agenda_evento: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    try:
        row = create_agenda_conn(conn=conn, id_user=id_user, id_agenda_evento=id_agenda_evento, payload=payload)
        conn.commit()
        return row
    finally:
        conn.close()

def create_agenda_conn(conn, id_user: int, id_agenda_evento: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Misma lógica que create_agenda(), pero usando una conexión existente (transacción externa).
    NO cierra conn. NO hace conn.commit(); eso lo hace el caller.
    """
    recurrence = payload.get("recurrence")
    is_recurring = 1 if recurrence else 0

    sql = """
    INSERT INTO agenda (
      id_agenda_evento,
      start_at,
      end_at,
      id_user,
      title,
      source_table,
      all_day,
      status,
      location,
      url,
      description,
      source_id,
      active,
      datetime,
      id_ciudad,
      reminder,
      in_person,
      is_recurring
    ) VALUES (
      %s, %s,%s, %s, %s, %s, %s,
      %s, %s, %s, %s, %s,
      1, NOW(), %s, %s, %s, %s
    )
    """

    cur = conn.cursor()
    try:
        cur.execute(
            sql,
            (
                id_agenda_evento,
                payload["start_at"],
                payload["end_at"],
                id_user,
                payload["title"],
                payload.get("source_table"),
                int(payload.get("all_day", 0)),
                payload.get("status", "active"),
                payload.get("location"),
                payload.get("url"),
                payload.get("description"),
                payload.get("source_id"),
                payload.get("ciudad_id"),
                payload.get("reminder") or "15m",
                int(payload.get("in_person", 0)),
                is_recurring,
            ),
        )
        new_id = cur.lastrowid

        if recurrence:
            _upsert_recurrence(conn, new_id, recurrence)

        row = get_agenda_by_id_conn(conn, id_user, new_id)
        if not row:
            raise ValueError("No se pudo leer el evento recién creado")
        return row
    finally:
        cur.close()


# ============================================================
# Update (conn)
# ============================================================
def _ensure_dir_for_agenda(id_agenda: int) -> FsPath:
    folder = BASE_UPLOADS_AGENDA / str(id_agenda)
    folder.mkdir(parents=True, exist_ok=True)
    return folder
from pathlib import Path

def _save_documento_agenda(
    *,
    id_agenda: int,
    filename: str,
    fileobj,
    conn,  # MISMA conexión
) -> dict:
    folder = _ensure_dir_for_agenda(id_agenda)

    ts_ms = int(datetime.timestamp(datetime.utcnow()) * 1000)
    ext = Path(filename).suffix.lower() or ".bin"

    # 1) guardar original
    original_name = f"{ts_ms}{ext}"
    original_path = folder / original_name

    with open(original_path, "wb") as f:
        shutil.copyfileobj(fileobj, f)

    # 2) normalizar a PDF (lo único que usará el sistema)
    if ext == ".pdf":
        pdf_name = original_name
        pdf_path = original_path
    else:
        pdf_name = f"{ts_ms}.pdf"
        pdf_path = folder / pdf_name

        # OBLIGATORIO: tú ya tienes esta función en conciliaciones.
        obj_conciliacion.convertir_a_pdf_or_throw(src_path=original_path, dst_path=pdf_path)

    # 3) insertar en DB: agenda_documentos.filename = pdf_name
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO agenda_documentos (filename, active, id_agenda)
            VALUES (%s, 1, %s)
            """,
            (pdf_name, id_agenda),
        )
        new_id = cur.lastrowid
    finally:
        cur.close()

    return {
        "id_agenda_documento": new_id,
        "id_agenda": id_agenda,
        "filename": pdf_name,
        "url": f"/uploads/agenda/{id_agenda}/{pdf_name}",
    }
def update_agenda_conn(conn, id_agenda: int, id_user: int, payload: Dict[str, Any]) -> int:
    """
    Actualiza un registro existente en agenda usando la MISMA conexión (transacción externa).
    NO maneja recurrence en columna agenda (porque recurrence vive en agenda_recurrence).
    Maneja recurrence vía _upsert/_remove y actualiza is_recurring.
    """
    rec = payload.get("recurrence", "__NO_TOUCH__")

    # Si te mandan recurrence explícito:
    # - None => remove recurrence y is_recurring=0
    # - dict => upsert y is_recurring=1
    touch_recurrence = rec != "__NO_TOUCH__"
    is_recurring = None

    if touch_recurrence:
        if rec is None:
            _remove_recurrence(conn, int(id_agenda))
            is_recurring = 0
        else:
            _upsert_recurrence(conn, int(id_agenda), rec)
            is_recurring = 1

    sql = """
    UPDATE agenda
    SET
      start_at = %s,
      end_at = %s,
      title = %s,
      source_table = %s,
      all_day = %s,
      status = %s,
      location = %s,
      description = %s,
      source_id = %s,
      id_ciudad = %s,
      reminder = %s,
      in_person = %s,
      is_recurring = COALESCE(%s, is_recurring)
    WHERE id_agenda = %s 
    """

    params = (
        payload.get("start_at"),
        payload.get("end_at"),
        payload.get("title"),
        payload.get("source_table"),
        int(payload.get("all_day") or 0),
        payload.get("status"),
        payload.get("location"),
        payload.get("description"),
        payload.get("source_id"),
        payload.get("ciudad_id"),
        payload.get("reminder") or "15m",
        int(payload.get("in_person") or 0),
        is_recurring,
        int(id_agenda),
      
    )

    cur = conn.cursor()
    try:
        cur.execute(sql, params)
        return cur.rowcount
    finally:
        cur.close()


# ============================================================
# Update (normal)
# ============================================================

def update_agenda(id_user: int, id_agenda: int, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        fields = []
        params: List[Any] = []

        def put(col: str, val: Any):
            fields.append(f"{col} = %s")
            params.append(val)

        if "start_at" in payload:
            put("start_at", payload["start_at"])
        if "end_at" in payload:
            put("end_at", payload["end_at"])
        if "title" in payload:
            put("title", payload["title"])
        if "source_table" in payload:
            put("source_table", payload["source_table"])
        if "all_day" in payload:
            put("all_day", int(payload["all_day"]))
        if "status" in payload:
            put("status", payload["status"])
        if "location" in payload:
            put("location", payload["location"])
        if "description" in payload:
            put("description", payload["description"])
        if "source_id" in payload:
            put("source_id", payload["source_id"])
        if "ciudad_id" in payload:
            put("id_ciudad", int(payload["ciudad_id"]))
        if "reminder" in payload:
            put("reminder", payload["reminder"])
        if "in_person" in payload:
            put("in_person", int(payload["in_person"]))
        if "active" in payload:
            put("active", int(payload["active"]))

        # recurrence vive en agenda_recurrence
        if "recurrence" in payload:
            rec = payload.get("recurrence")
            if rec is None:
                _remove_recurrence(conn, id_agenda)
                put("is_recurring", 0)
            else:
                _upsert_recurrence(conn, id_agenda, rec)
                put("is_recurring", 1)

        if fields:
            params.extend([id_agenda])
            sql = f"""
            UPDATE agenda
            SET {", ".join(fields)}
            WHERE id_agenda = %s 
            LIMIT 1
            """
            cur = conn.cursor()
            try:
                cur.execute(sql, params)
                conn.commit()
                if cur.rowcount == 0:
                    return None
            finally:
                cur.close()

        return get_agenda_by_id_conn(conn, id_user, id_agenda)
    finally:
        conn.close()


# ============================================================
# Delete
# ============================================================

def delete_agenda_soft(id_user: int, id_agenda: int) -> bool:
    conn = get_connection()
    try:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                UPDATE agenda
                SET active = 0
                WHERE id_agenda = %s 
                LIMIT 1
                """,
                (id_agenda,),
            )
            affected = cur.rowcount

            cur.execute("UPDATE agenda_recurrence SET active = 0 WHERE id_agenda = %s", (id_agenda,))
            conn.commit()
            return affected > 0
        finally:
            cur.close()
    finally:
        conn.close()


# ============================================================
# Change detection (para decidir WS)
# ============================================================

def _agenda_changed_db(old_row: Dict[str, Any], new_payload: Dict[str, Any]) -> bool:
    """
    old_row: row crudo de DB (get_agenda_raw_by_id_conn)
    new_payload: payload tipo agenda_payload (con ciudad_id etc.)
    """
    def ns(x):  # normalize string
        return (x or "").strip()

    def ni(x):  # normalize int
        try:
            return int(x)
        except Exception:
            return 0

    if old_row.get("start_at") != new_payload.get("start_at"):
        return True
    if old_row.get("end_at") != new_payload.get("end_at"):
        return True
    if ns(old_row.get("title")) != ns(new_payload.get("title")):
        return True
    if ns(old_row.get("status")) != ns(new_payload.get("status")):
        return True
    if ni(old_row.get("all_day")) != ni(new_payload.get("all_day")):
        return True
    if ni(old_row.get("id_ciudad")) != ni(new_payload.get("ciudad_id")):
        return True

    # si esto se muestra en tu UI, déjalo; si no, quítalo
    if ns(old_row.get("location")) != ns(new_payload.get("location")):
        return True

    # recurrence: si te interesa, marca changed cuando venga recurrence en payload
    # (si no viene, no lo tocamos)
    if "recurrence" in new_payload and new_payload.get("recurrence", "__NO_TOUCH__") != "__NO_TOUCH__":

        return True

    return False


def get_agenda_by_source(id_user: int, source_table: str, source_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT id_agenda, source_table, source_id, start_at, end_at, title,
                       all_day, status, location, description, id_ciudad, reminder,
                       in_person, is_recurring, url
                FROM agenda
                WHERE id_user = %s AND source_table = %s AND source_id = %s AND active = 1
                ORDER BY id_agenda DESC
                LIMIT 1
                """,
                (id_user, source_table, source_id),
            )
            return cur.fetchone()
    finally:
        conn.close()
