from __future__ import annotations
from typing import Any, Dict, List, Optional
from ..db import get_connection
import datetime as dt


# ================== PUESTOS ==================

def list_puestos() -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT * FROM puestos WHERE active = 1 ORDER BY nombre ASC"
            )
            return cur.fetchall() or []
    finally:
        conn.close()


def create_puesto(nombre: str) -> Dict[str, Any]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO puestos (nombre, active) VALUES (%s, 1)",
                (nombre.strip(),),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id_puesto": new_id, "nombre": nombre.strip()}
    finally:
        conn.close()


# ================== TRABAJADORES ==================

def list_trabajadores(search: Optional[str] = None, id_cliente: Optional[int] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            conditions = ["t.active = 1"]
            params: List[Any] = []
            if id_cliente is not None:
                conditions.append("t.id_cliente = %s")
                params.append(id_cliente)
            if search:
                conditions.append("(t.nombre LIKE %s OR t.apellido LIKE %s)")
                like = f"%{search}%"
                params.extend([like, like])
            where = " AND ".join(conditions)
            cur.execute(
                f"""
                SELECT t.*, p.nombre AS nombre_puesto
                FROM trabajadores t
                LEFT JOIN puestos p ON p.id_puesto = t.id_puesto
                WHERE {where}
                ORDER BY t.nombre ASC, t.apellido ASC
                """,
                params,
            )
            return cur.fetchall() or []
    finally:
        conn.close()


def get_trabajador_by_id(id_trabajador: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT t.*, p.nombre AS nombre_puesto
                FROM trabajadores t
                LEFT JOIN puestos p ON p.id_puesto = t.id_puesto
                WHERE t.id_trabajador = %s AND t.active = 1
                LIMIT 1
                """,
                (int(id_trabajador),),
            )
            row = cur.fetchone()
        if row:
            for k in ("fecha_nacimiento", "datetime"):
                if hasattr(row.get(k), "isoformat"):
                    row[k] = row[k].isoformat()
        return row
    finally:
        conn.close()


def create_trabajador(data: Dict[str, Any], id_user: int, id_cliente: Optional[int] = None) -> Dict[str, Any]:
    now = dt.datetime.now()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO trabajadores
                    (nombre, apellido, fecha_nacimiento, id_puesto, active, id_user, datetime, id_cliente)
                VALUES (%s, %s, %s, %s, 1, %s, %s, %s)
                """,
                (
                    data.get("nombre", ""),
                    data.get("apellido", ""),
                    data.get("fecha_nacimiento") or None,
                    data.get("id_puesto") or None,
                    id_user,
                    now,
                    id_cliente,
                ),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id_trabajador": new_id}
    finally:
        conn.close()


def update_trabajador_imagen(id_trabajador: int, filename: str, path: str) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE trabajadores SET filename = %s, path = %s WHERE id_trabajador = %s",
                (filename, path, int(id_trabajador)),
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()


def update_trabajador(id_trabajador: int, data: Dict[str, Any]) -> int:
    allowed = {"nombre", "apellido", "fecha_nacimiento", "id_puesto"}
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return 0
    conn = get_connection()
    try:
        set_clause = ", ".join(f"{k} = %s" for k in updates)
        vals = list(updates.values()) + [int(id_trabajador)]
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE trabajadores SET {set_clause} WHERE id_trabajador = %s AND active = 1",
                vals,
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()


def delete_trabajador(id_trabajador: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE trabajadores SET active = 0 WHERE id_trabajador = %s",
                (int(id_trabajador),),
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()


# ================== ANALISIS TRABAJADOR ==================

def get_trabajador_analisis(id_trabajador: int, date_from: str, date_to: str) -> Dict[str, Any]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id_puesto FROM trabajadores WHERE id_trabajador = %s LIMIT 1",
                (id_trabajador,),
            )
            trab_row = cur.fetchone()
            id_puesto = trab_row["id_puesto"] if trab_row else None

            cur.execute(
                """
                SELECT
                    c.id_contrato,
                    c.cliente_nombre,
                    c.fecha_evento,
                    c.hora_inicio,
                    c.hora_final,
                    p.nombre AS nombre_puesto_evento,
                    ROUND(
                        CASE
                            WHEN c.hora_inicio IS NOT NULL AND c.hora_final IS NOT NULL
                            THEN TIMESTAMPDIFF(MINUTE,
                                TIMESTAMP(DATE(c.fecha_evento), TIME(c.hora_inicio)),
                                CASE WHEN TIME(c.hora_final) < TIME(c.hora_inicio)
                                     THEN TIMESTAMP(DATE(c.fecha_evento) + INTERVAL 1 DAY, TIME(c.hora_final))
                                     ELSE TIMESTAMP(DATE(c.fecha_evento), TIME(c.hora_final))
                                END
                            ) / 60.0
                            ELSE 0
                        END, 2
                    ) AS duracion_horas
                FROM contratos_trabajadores ct
                JOIN contratos c ON c.id_contrato = ct.id_contrato
                LEFT JOIN puestos p ON p.id_puesto = ct.id_puesto
                WHERE ct.id_trabajador = %s
                  AND ct.active = 1
                  AND c.active = 1
                  AND c.fecha_evento BETWEEN %s AND %s
                ORDER BY c.fecha_evento DESC
                """,
                (id_trabajador, date_from, date_to),
            )
            eventos = cur.fetchall() or []

            eventos_count = len(eventos)
            total_horas = sum(float(e.get("duracion_horas") or 0) for e in eventos)

            cur.execute(
                """
                SELECT COUNT(*) AS total
                FROM contratos
                WHERE active = 1 AND fecha_evento BETWEEN %s AND %s
                """,
                (date_from, date_to),
            )
            total_row = cur.fetchone()
            total_eventos_negocio = int(total_row["total"]) if total_row else 0

            tasa_pct = (
                round(eventos_count / total_eventos_negocio * 100, 1)
                if total_eventos_negocio > 0 else 0
            )

            comparacion: List[Dict[str, Any]] = []
            if id_puesto:
                cur.execute(
                    """
                    SELECT
                        t.id_trabajador,
                        CONCAT(t.nombre, ' ', t.apellido) AS nombre,
                        COUNT(DISTINCT ct2.id_contrato) AS eventos_count
                    FROM trabajadores t
                    LEFT JOIN contratos_trabajadores ct2 ON ct2.id_trabajador = t.id_trabajador AND ct2.active = 1
                    LEFT JOIN contratos c2 ON c2.id_contrato = ct2.id_contrato
                        AND c2.active = 1
                        AND c2.fecha_evento BETWEEN %s AND %s
                    WHERE t.id_puesto = %s AND t.active = 1
                    GROUP BY t.id_trabajador, t.nombre, t.apellido
                    ORDER BY eventos_count DESC, t.nombre ASC
                    """,
                    (date_from, date_to, id_puesto),
                )
                comparacion = cur.fetchall() or []

            for e in eventos:
                for k in ("fecha_evento", "hora_inicio", "hora_final"):
                    if hasattr(e.get(k), "isoformat"):
                        e[k] = e[k].isoformat()

            return {
                "stats": {
                    "eventos_count": eventos_count,
                    "total_horas": round(total_horas, 2),
                    "tasa_pct": tasa_pct,
                    "total_eventos_negocio": total_eventos_negocio,
                },
                "eventos": eventos,
                "comparacion_puesto": comparacion,
            }
    finally:
        conn.close()


# ================== CONTRATOS TRABAJADORES ==================

def list_contrato_trabajadores(id_contrato: int) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT
                    ct.id_contrato_trabajador,
                    ct.id_contrato,
                    ct.id_trabajador,
                    ct.id_puesto,
                    t.nombre AS nombre_trabajador,
                    t.apellido AS apellido_trabajador,
                    t.path AS path_trabajador,
                    p.nombre AS nombre_puesto
                FROM contratos_trabajadores ct
                JOIN trabajadores t ON t.id_trabajador = ct.id_trabajador AND t.active = 1
                LEFT JOIN puestos p ON p.id_puesto = ct.id_puesto
                WHERE ct.id_contrato = %s AND ct.active = 1
                ORDER BY t.nombre ASC
                """,
                (id_contrato,),
            )
            return cur.fetchall() or []
    finally:
        conn.close()


def is_trabajador_en_contrato(id_contrato: int, id_trabajador: int) -> bool:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT 1 FROM contratos_trabajadores
                WHERE id_contrato = %s AND id_trabajador = %s AND active = 1
                LIMIT 1
                """,
                (id_contrato, id_trabajador),
            )
            return cur.fetchone() is not None
    finally:
        conn.close()


def add_contrato_trabajador(
    id_contrato: int,
    id_trabajador: int,
    id_puesto: Optional[int],
    id_user: int,
) -> Dict[str, Any]:
    now = dt.datetime.now()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO contratos_trabajadores
                    (id_contrato, id_trabajador, id_puesto, active, datetime, id_user)
                VALUES (%s, %s, %s, 1, %s, %s)
                """,
                (id_contrato, id_trabajador, id_puesto or None, now, id_user),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id_contrato_trabajador": new_id}
    finally:
        conn.close()


def delete_contrato_trabajador(id_contrato: int, id_contrato_trabajador: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE contratos_trabajadores SET active = 0
                WHERE id_contrato_trabajador = %s AND id_contrato = %s AND active = 1
                """,
                (id_contrato_trabajador, id_contrato),
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()
