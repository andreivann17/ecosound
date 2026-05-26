from __future__ import annotations
from typing import Any, Dict, List, Optional
from ..db import get_connection
import datetime as dt

_SELECT_COLS = """
    s.id_contrato          AS id_sesion,
    s.cliente_nombre       AS nombre_cliente,
    s.datetime_fotografia  AS fecha_sesion,
    s.lugar_fotografia     AS lugar,
    s.id_ciudad_fotografia AS id_ciudad,
    s.comentarios_fotografia AS comentarios,
    s.datetime,
    s.active,
    s.id_cliente
"""

_FIELD_MAP = {
    "nombre_cliente": "cliente_nombre",
    "id_ciudad":      "id_ciudad_fotografia",
    "lugar":          "lugar_fotografia",
    "fecha_sesion":   "datetime_fotografia",
    "comentarios":    "comentarios_fotografia",
}


def create_sesion(
    data: Dict[str, Any],
    id_user_created: int,
    conn,
    id_cliente: Optional[int] = None,
) -> Dict[str, Any]:
    now = dt.datetime.now()
    sql = """
        INSERT INTO contratos (
            id_user,
            cliente_nombre,
            datetime_fotografia,
            lugar_fotografia,
            id_ciudad_fotografia,
            comentarios_fotografia,
            importe,
            importe_anticipo,
            datetime,
            code,
            active,
            id_cliente
        ) VALUES (%s, %s, %s, %s, %s, %s, '0', '0', %s, '', 1, %s)
    """
    with conn.cursor() as cur:
        cur.execute(sql, (
            id_user_created,
            data.get("nombre_cliente", ""),
            data.get("fecha_sesion"),
            data.get("lugar") or None,
            data.get("id_ciudad") or None,
            data.get("comentarios") or None,
            now,
            id_cliente or 0,
        ))
        new_id = cur.lastrowid

    return {"id_sesion": new_id}


def get_sesion_by_id(id_sesion) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                f"""
                SELECT {_SELECT_COLS},
                       ci.nombre AS nombre_ciudad
                FROM contratos s
                LEFT JOIN ciudades ci ON ci.id_ciudad = s.id_ciudad_fotografia
                WHERE s.id_contrato = %s AND s.datetime_fotografia IS NOT NULL
                LIMIT 1
                """,
                (int(id_sesion),),
            )
            return cur.fetchone()
    finally:
        conn.close()


def list_sesiones(
    nombre_cliente: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    active: Optional[int] = None,
    search: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    id_cliente: Optional[int] = None,
) -> List[Dict[str, Any]]:
    conditions = ["s.datetime_fotografia IS NOT NULL", "s.active = 1"]
    params: List[Any] = []

    if id_cliente is not None:
        conditions.append("s.id_cliente = %s")
        params.append(id_cliente)

    if nombre_cliente:
        conditions.append("s.cliente_nombre LIKE %s")
        params.append(f"%{nombre_cliente}%")

    if search:
        conditions.append("(s.cliente_nombre LIKE %s OR s.lugar_fotografia LIKE %s)")
        like = f"%{search}%"
        params.extend([like, like])

    if date_from:
        conditions.append("s.datetime_fotografia >= %s")
        params.append(date_from)

    if date_to:
        conditions.append("s.datetime_fotografia <= %s")
        params.append(date_to)

    where = "WHERE " + " AND ".join(conditions)

    sql = f"""
        SELECT {_SELECT_COLS}
        FROM contratos s
        {where}
        ORDER BY s.datetime_fotografia DESC
    """

    if limit is not None:
        sql += f" LIMIT {int(limit)}"
        if offset is not None:
            sql += f" OFFSET {int(offset)}"

    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(sql, params)
            return cur.fetchall() or []
    finally:
        conn.close()


def update_sesion(
    id_sesion,
    data: Dict[str, Any],
    conn,
) -> int:
    updates = {_FIELD_MAP[k]: v for k, v in data.items() if k in _FIELD_MAP}
    if not updates:
        return 0

    set_clause = ", ".join(f"{k} = %s" for k in updates)
    vals = list(updates.values()) + [int(id_sesion)]

    with conn.cursor() as cur:
        cur.execute(
            f"UPDATE contratos SET {set_clause} WHERE id_contrato = %s",
            vals,
        )
        return cur.rowcount
