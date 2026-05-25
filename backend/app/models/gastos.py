from __future__ import annotations
from typing import Any, Dict, List, Optional
from ..db import get_connection
import datetime as dt


def list_gastos(
    search: Optional[str] = None,
    id_tipo_gasto: Optional[int] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    id_cliente: Optional[int] = None,
) -> List[Dict[str, Any]]:
    conditions = ["g.active_sistema = 1"]
    params: List[Any] = []

    if id_cliente is not None:
        conditions.append("g.id_cliente = %s")
        params.append(id_cliente)

    if search:
        conditions.append("g.descripcion LIKE %s")
        params.append(f"%{search}%")

    if id_tipo_gasto:
        conditions.append("g.id_tipo_gasto = %s")
        params.append(id_tipo_gasto)

    if fecha_desde:
        conditions.append("g.fecha >= %s")
        params.append(fecha_desde)

    if fecha_hasta:
        conditions.append("g.fecha <= %s")
        params.append(fecha_hasta)

    where = "WHERE " + " AND ".join(conditions)

    sql = f"""
        SELECT g.id_gasto, g.descripcion, g.monto, g.fecha,
               g.id_user, g.id_cliente, g.id_tipo_gasto, g.active, g.datetime,
               g.notas, g.filename, g.path,
               tg.nombre AS nombre_tipo_gasto,
               u.name AS nombre_usuario
        FROM gastos g
        LEFT JOIN tipo_gastos tg ON tg.id_tipo_gasto = g.id_tipo_gasto
        LEFT JOIN users u ON u.id_user = g.id_user
        {where}
        ORDER BY g.fecha DESC, g.id_gasto DESC
    """
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(sql, params)
            rows = cur.fetchall() or []
        for r in rows:
            for k in ("fecha", "datetime"):
                if hasattr(r.get(k), "isoformat"):
                    r[k] = r[k].isoformat()
        return rows
    finally:
        conn.close()


def get_gasto_by_id(id_gasto: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT g.id_gasto, g.descripcion, g.monto, g.fecha,
                       g.id_user, g.id_cliente, g.id_tipo_gasto, g.active, g.datetime,
                       g.notas, g.filename, g.path,
                       tg.nombre AS nombre_tipo_gasto,
                       u.name AS nombre_usuario
                FROM gastos g
                LEFT JOIN tipo_gastos tg ON tg.id_tipo_gasto = g.id_tipo_gasto
                LEFT JOIN users u ON u.id_user = g.id_user
                WHERE g.id_gasto = %s AND g.active_sistema = 1
                LIMIT 1
                """,
                (id_gasto,),
            )
            row = cur.fetchone()
        if row:
            for k in ("fecha", "datetime"):
                if hasattr(row.get(k), "isoformat"):
                    row[k] = row[k].isoformat()
        return row
    finally:
        conn.close()


def create_gasto(data: Dict[str, Any], id_user: int, id_cliente: Optional[int] = None) -> Dict[str, Any]:
    now = dt.datetime.now()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO gastos
                    (descripcion, monto, fecha, id_tipo_gasto, notas, id_user, id_cliente, active, active_sistema, datetime)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 1, 1, %s)
                """,
                (
                    data.get("descripcion"),
                    data.get("monto"),
                    data.get("fecha") or now.date(),
                    data.get("id_tipo_gasto") or None,
                    data.get("notas") or None,
                    id_user,
                    id_cliente,
                    now,
                ),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id_gasto": new_id}
    finally:
        conn.close()


def update_gasto(id_gasto: int, data: Dict[str, Any]) -> int:
    allowed = {"descripcion", "monto", "id_tipo_gasto", "fecha", "notas", "filename", "path", "active"}
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return 0
    conn = get_connection()
    try:
        set_clause = ", ".join(f"{k} = %s" for k in updates)
        vals = list(updates.values()) + [id_gasto]
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE gastos SET {set_clause} WHERE id_gasto = %s AND active_sistema = 1",
                vals,
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()


def delete_gasto(id_gasto: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE gastos SET active_sistema = 0 WHERE id_gasto = %s",
                (id_gasto,),
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()


def get_resumen_gastos(id_cliente: Optional[int] = None) -> Dict[str, Any]:
    conditions = ["g.active_sistema = 1"]
    params: List[Any] = []
    if id_cliente is not None:
        conditions.append("g.id_cliente = %s")
        params.append(id_cliente)
    where = "WHERE " + " AND ".join(conditions)

    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                f"SELECT COALESCE(SUM(monto), 0) AS total, COUNT(*) AS cantidad FROM gastos g {where}",
                params,
            )
            totals = cur.fetchone() or {}

            cur.execute(
                f"""
                SELECT tg.nombre AS tipo, COALESCE(SUM(g.monto), 0) AS total, COUNT(*) AS cantidad
                FROM gastos g
                LEFT JOIN tipo_gastos tg ON tg.id_tipo_gasto = g.id_tipo_gasto
                {where}
                GROUP BY g.id_tipo_gasto, tg.nombre
                ORDER BY total DESC
                """,
                params,
            )
            por_tipo = cur.fetchall() or []

        return {
            "total": float(totals.get("total") or 0),
            "cantidad": int(totals.get("cantidad") or 0),
            "por_tipo": por_tipo,
        }
    finally:
        conn.close()


# ── Tipos de gasto ──────────────────────────────────────────────────────────

def list_tipo_gastos(id_cliente: Optional[int] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            if id_cliente is not None:
                cur.execute(
                    "SELECT * FROM tipo_gastos WHERE active = 1 AND id_cliente = %s ORDER BY nombre",
                    (id_cliente,),
                )
            else:
                cur.execute(
                    "SELECT * FROM tipo_gastos WHERE active = 1 ORDER BY nombre"
                )
            return cur.fetchall() or []
    finally:
        conn.close()


def create_tipo_gasto(nombre: str, id_cliente: Optional[int] = None) -> Dict[str, Any]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            if id_cliente is not None:
                cur.execute(
                    "SELECT id_tipo_gasto FROM tipo_gastos WHERE nombre = %s AND id_cliente = %s AND active = 1",
                    (nombre, id_cliente),
                )
            else:
                cur.execute(
                    "SELECT id_tipo_gasto FROM tipo_gastos WHERE nombre = %s AND id_cliente IS NULL AND active = 1",
                    (nombre,),
                )
            if cur.fetchone():
                raise ValueError(f"Ya existe un tipo con ese nombre: {nombre}")
            cur.execute(
                "INSERT INTO tipo_gastos (nombre, active, id_cliente) VALUES (%s, 1, %s)",
                (nombre, id_cliente),
            )
            new_id = cur.lastrowid
            cur.execute("SELECT * FROM tipo_gastos WHERE id_tipo_gasto = %s", (new_id,))
            row = cur.fetchone()
        conn.commit()
        return row
    finally:
        conn.close()


def delete_tipo_gasto(id_tipo_gasto: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE tipo_gastos SET active = 0 WHERE id_tipo_gasto = %s",
                (id_tipo_gasto,),
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()
