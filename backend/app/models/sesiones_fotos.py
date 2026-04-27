from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
from ..db import get_connection
import datetime as dt


# ================== CRUD ==================

def create_sesion(
    data: Dict[str, Any],
    id_user_created: int,
    conn,
) -> Dict[str, Any]:
    """
    Inserta una sesión de fotos. Devuelve {id_sesion}.
    """
    now = dt.datetime.now()
    sql = """
        INSERT INTO sesiones (
            nombre_cliente,
            id_ciudad,
            lugar,
            fecha_sesion,
            comentarios,
            datetime,
            active
        ) VALUES (%s, %s, %s, %s, %s, %s, 1)
    """
    with conn.cursor() as cur:
        cur.execute(sql, (
            data.get("nombre_cliente", ""),
            data.get("id_ciudad") or None,
            data.get("lugar") or None,
            data.get("fecha_sesion"),
            data.get("comentarios") or None,
            now,
        ))
        new_id = cur.lastrowid

    return {"id_sesion": new_id}


def get_sesion_by_id(id_sesion) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT s.*, c.nombre AS nombre_ciudad
                FROM sesiones s
                LEFT JOIN ciudades c ON c.id_ciudad = s.id_ciudad
                WHERE s.id_sesion = %s
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
) -> List[Dict[str, Any]]:
    conditions = []
    params: List[Any] = []

    if active is not None:
        conditions.append("s.active = %s")
        params.append(active)

    if nombre_cliente:
        conditions.append("s.nombre_cliente LIKE %s")
        params.append(f"%{nombre_cliente}%")

    if search:
        conditions.append(
            "(s.nombre_cliente LIKE %s OR s.lugar LIKE %s)"
        )
        like = f"%{search}%"
        params.extend([like, like])

    if date_from:
        conditions.append("s.fecha_sesion >= %s")
        params.append(date_from)

    if date_to:
        conditions.append("s.fecha_sesion <= %s")
        params.append(date_to)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    sql = f"""
        SELECT s.*
        FROM sesiones s
        {where}
        ORDER BY s.fecha_sesion DESC
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
    """Actualiza campos permitidos. Devuelve rows_affected."""
    allowed = {"nombre_cliente", "id_ciudad", "lugar", "fecha_sesion", "comentarios"}
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return 0

    set_clause = ", ".join(f"{k} = %s" for k in updates)
    vals = list(updates.values()) + [int(id_sesion)]

    with conn.cursor() as cur:
        cur.execute(
            f"UPDATE sesiones SET {set_clause} WHERE id_sesion = %s",
            vals,
        )
        return cur.rowcount
