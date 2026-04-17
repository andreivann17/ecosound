# models/audit_log.py
from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime
import json

from ..db import get_connection

AUDIT_ALLOWED_COLS = {
    "action",
    "changes",
    "extra",
    "ip_address",
    "user_agent",
    "id_user",
    "id_modulo",
    "id_key",
    "message",
}

LEN_LIMITS = {
    "action": 50,
    "ip_address": 45,
    "user_agent": 255,
    "message": 255,
}


def _trim(s: Optional[str]) -> Optional[str]:
    if s is None:
        return None
    return s.strip() if isinstance(s, str) else s


def _validate_lengths(d: Dict[str, Any]) -> List[str]:
    errs: List[str] = []
    for k, lim in LEN_LIMITS.items():
        v = d.get(k)
        if v is None:
            continue
        if isinstance(v, str) and len(v) > lim:
            errs.append(f"{k} excede {lim} caracteres")
    return errs


def _maybe_json(v: Any) -> Any:
    """
    Si viene dict/list -> lo guarda como JSON string.
    Si viene string -> lo guarda tal cual.
    """
    if v is None:
        return None
    if isinstance(v, (dict, list)):
        return json.dumps(v, ensure_ascii=False)
    return v


def _sanitize_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for k in AUDIT_ALLOWED_COLS:
        if k not in data:
            continue
        v = data[k]

        if k in ("action", "ip_address", "user_agent", "message"):
            v = _trim(v) if isinstance(v, str) else v

        if k in ("id_user", "id_modulo") and v is not None:
            try:
                v = int(v)
            except Exception:
                v = None

        if k == "id_key" and v is not None:
            v = _trim(str(v))


        out[k] = v
    return out


def create_audit_log(*, data: Dict[str, Any]) -> int:
    payload = _sanitize_payload(data)
    errs = _validate_lengths(payload)
    if errs:
        raise ValueError(", ".join(errs))

    # Validaciones obligatorias
    if not payload.get("action"):
        raise ValueError("action es requerido")
    if not payload.get("message"):
        raise ValueError("message es requerido")

    conn = get_connection()
    
    try:
        with conn.cursor() as cur:
            # Aseguramos valores por defecto
            payload.setdefault("id_user", 0)
            
            cols = []
            params = []

            # --- CORRECCIÓN AQUÍ: Iterar para procesar diccionarios ---
            for k, v in payload.items():
                cols.append(k)
                # Si el valor es un dict (como 'changes'), lo convertimos a texto JSON
                if isinstance(v, (dict, list)):
                    params.append(json.dumps(v))
                else:
                    params.append(v)

            # Agregar el timestamp
            cols.append("datetime")
            params.append(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

            # Crear los placeholders (%s, %s, ...) según el número de columnas
            placeholders = ", ".join(["%s"] * len(cols))
            
            # Construir la sentencia
            sql = f"INSERT INTO audit_log ({', '.join(cols)}) VALUES ({placeholders})"
            
            # Ejecutar pasando los parámetros limpios
            cur.execute(sql, tuple(params))
            
            conn.commit()
            return cur.lastrowid
            
    except Exception as e:
        conn.rollback() 
        raise e
    finally:
        conn.close()

def get_audit_log_by_id(*, id_audit_log: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT
                    id_audit_log,
                    action,
                    changes,
                    extra,
                    ip_address,
                    user_agent,
                    id_user,
                    datetime,
                    id_modulo,
                    id_key,
                    message
                FROM audit_log
                WHERE id_audit_log = %s
                """,
                (id_audit_log,),
            )
            return cur.fetchone()
    finally:
        conn.close()


def list_audit_logs(
    *,
    filters: Dict[str, Any],
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Filtros soportados:
      - id_modulo, id_key, action, id_user, date_from, date_to
    """
    where: List[str] = []
    params: List[Any] = []

    def _to_int(v):
        if v is None or v == "":
            return None
        try:
            return int(v)
        except Exception:
            return None

    id_modulo = _to_int(filters.get("id_modulo"))
    if id_modulo is not None:
        where.append("al.id_modulo = %s")
        params.append(id_modulo)

    id_key = (filters.get("id_key") or "").strip()
    if id_key:
        where.append("al.id_key = %s")
        params.append(id_key)


    action = (filters.get("action") or "").strip()
    if action:
        where.append("al.action = %s")
        params.append(action.upper())

    id_user = _to_int(filters.get("id_user"))
    if id_user is not None:
        where.append("al.id_user = %s")
        params.append(id_user)

    date_from = (filters.get("date_from") or "").strip()
    if date_from:
        where.append("al.datetime >= %s")
        params.append(date_from)

    date_to = (filters.get("date_to") or "").strip()
    if date_to:
        where.append("al.datetime <= %s")
        params.append(date_to)

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            # total (IMPORTANTE: mismo alias al)
            cur.execute(
                f"SELECT COUNT(*) AS total FROM audit_log al {where_sql}",
                tuple(params),
            )
            total = int((cur.fetchone() or {}).get("total", 0))

            # items
            cur.execute(
                f"""
                SELECT
                    al.id_audit_log,
                    al.action,
                    al.changes,
                    al.extra,
                    al.ip_address,
                    al.user_agent,
                    al.id_user,
                    al.datetime,
                    al.id_modulo,
                    al.id_key,
                    al.message,

                    u.name AS user_name,
                    u.email AS user_email
                FROM audit_log al
                LEFT JOIN users u
                    ON u.id_user = al.id_user
                {where_sql}
                ORDER BY al.datetime DESC, al.id_audit_log DESC
                LIMIT %s OFFSET %s
                """,
                tuple(params + [limit, offset]),
            )
            rows = cur.fetchall()
            return rows, total
    finally:
        conn.close()