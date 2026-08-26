from __future__ import annotations
from typing import Any, Dict, List, Optional
from ..db import get_connection
from . import audit as audit_model
import datetime as dt

TRABAJADOR_MODULO = 5


def log_actividad_trabajador(action: str, message: str, id_trabajador: int, user_id: int, changes=None) -> None:
    """Registra en audit_log una acción sobre un trabajador (id_modulo=TRABAJADOR_MODULO).

    Se usa tanto desde el router de trabajadores como desde otros routers
    (p. ej. eventos) que modifican asignaciones de un trabajador, para que
    todo quede visible en su tab de Actividad. No bloquea si falla.
    """
    try:
        audit_model.create_audit_log(data={
            "action": action,
            "message": message,
            "id_user": user_id,
            "id_modulo": TRABAJADOR_MODULO,
            "id_key": str(id_trabajador),
            "changes": changes,
        })
    except Exception:
        pass


# ================== PUESTOS ==================

def list_puestos(id_cliente: Optional[int] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            conditions = ["active = 1"]
            params: List[Any] = []
            if id_cliente is not None:
                conditions.append("id_cliente = %s")
                params.append(id_cliente)
            where = " AND ".join(conditions)
            cur.execute(
                f"SELECT * FROM puestos WHERE {where} ORDER BY nombre ASC",
                params,
            )
            return cur.fetchall() or []
    finally:
        conn.close()


def create_puesto(nombre: str, id_cliente: Optional[int] = None) -> Dict[str, Any]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO puestos (nombre, active, id_cliente) VALUES (%s, 1, %s)",
                (nombre.strip(), id_cliente or 0),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id_puesto": new_id, "nombre": nombre.strip(), "id_cliente": id_cliente or 0}
    finally:
        conn.close()


def delete_puesto(id_puesto: int, id_cliente: Optional[int] = None) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            conditions = ["id_puesto = %s", "active = 1"]
            params: List[Any] = [int(id_puesto)]
            if id_cliente is not None:
                conditions.append("id_cliente = %s")
                params.append(id_cliente)
            where = " AND ".join(conditions)
            cur.execute(
                f"UPDATE puestos SET active = 0 WHERE {where}",
                params,
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()


# ================== TRABAJADORES ==================

def list_trabajadores(
    search: Optional[str] = None,
    id_cliente: Optional[int] = None,
    id_puesto: Optional[int] = None,
) -> List[Dict[str, Any]]:
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
            if id_puesto is not None:
                # Coincide con el puesto base del trabajador o con cualquier
                # puesto en el que haya trabajado según contratos_trabajadores
                conditions.append(
                    "(t.id_puesto = %s OR EXISTS ("
                    "SELECT 1 FROM contratos_trabajadores ct "
                    "WHERE ct.id_trabajador = t.id_trabajador "
                    "AND ct.active = 1 AND ct.id_puesto = %s))"
                )
                params.extend([id_puesto, id_puesto])
            where = " AND ".join(conditions)
            cur.execute(
                f"""
                SELECT t.*, p.nombre AS nombre_puesto,
                    (
                        SELECT GROUP_CONCAT(DISTINCT p2.nombre ORDER BY p2.nombre SEPARATOR ', ')
                        FROM contratos_trabajadores ct2
                        LEFT JOIN puestos p2 ON p2.id_puesto = ct2.id_puesto
                        WHERE ct2.id_trabajador = t.id_trabajador
                          AND ct2.active = 1 AND ct2.id_puesto IS NOT NULL
                    ) AS puestos_trabajados
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

            # Usa ct.hora_inicio/hora_final (horario real del trabajador)
            # y COALESCE(es.fecha_evento, c.fecha_evento) para soportar el
            # sistema nuevo (eventos_servicios) y el legado (contratos.fecha_evento)
            cur.execute(
                """
                SELECT
                    c.id_contrato,
                    c.cliente_nombre,
                    COALESCE(DATE(ct.fecha_inicio), es.fecha_evento, c.fecha_evento, DATE(c.datetime)) AS fecha_evento,
                    ct.hora_inicio,
                    ct.hora_final,
                    ct.fecha_inicio,
                    ct.fecha_final,
                    p.nombre AS nombre_puesto_evento,
                    ROUND(
                        CASE
                            WHEN ct.fecha_inicio IS NOT NULL AND ct.fecha_final IS NOT NULL
                            THEN TIMESTAMPDIFF(MINUTE, ct.fecha_inicio, ct.fecha_final) / 60.0
                            WHEN ct.hora_inicio IS NOT NULL AND ct.hora_final IS NOT NULL
                            THEN TIMESTAMPDIFF(MINUTE,
                                TIMESTAMP(DATE(COALESCE(DATE(ct.fecha_inicio), es.fecha_evento, c.fecha_evento, DATE(c.datetime))), TIME(ct.hora_inicio)),
                                CASE WHEN TIME(ct.hora_final) < TIME(ct.hora_inicio)
                                     THEN TIMESTAMP(DATE(COALESCE(DATE(ct.fecha_inicio), es.fecha_evento, c.fecha_evento, DATE(c.datetime))) + INTERVAL 1 DAY, TIME(ct.hora_final))
                                     ELSE TIMESTAMP(DATE(COALESCE(DATE(ct.fecha_inicio), es.fecha_evento, c.fecha_evento, DATE(c.datetime))), TIME(ct.hora_final))
                                END
                            ) / 60.0
                            ELSE 0
                        END, 2
                    ) AS duracion_horas
                FROM contratos_trabajadores ct
                JOIN contratos c ON c.id_contrato = ct.id_contrato
                LEFT JOIN eventos_servicios es ON es.id_evento_servicio = ct.id_evento_servicio
                LEFT JOIN puestos p ON p.id_puesto = ct.id_puesto
                WHERE ct.id_trabajador = %s
                  AND ct.active = 1
                  AND c.active = 1
                  AND COALESCE(DATE(ct.fecha_inicio), es.fecha_evento, c.fecha_evento, DATE(c.datetime)) BETWEEN %s AND %s
                ORDER BY COALESCE(DATE(ct.fecha_inicio), es.fecha_evento, c.fecha_evento, DATE(c.datetime)) DESC
                """,
                (id_trabajador, date_from, date_to),
            )
            eventos = cur.fetchall() or []

            # Contar eventos únicos (un trabajador puede tener múltiples filas por evento)
            eventos_unicos = {e["id_contrato"] for e in eventos}
            eventos_count = len(eventos_unicos)
            total_horas = sum(float(e.get("duracion_horas") or 0) for e in eventos)

            # Total de eventos del negocio en el período (legado + nuevos con servicios)
            cur.execute(
                """
                SELECT COUNT(DISTINCT c.id_contrato) AS total
                FROM contratos c
                WHERE c.active = 1
                  AND (
                    COALESCE(c.fecha_evento, DATE(c.datetime)) BETWEEN %s AND %s
                    OR EXISTS (
                        SELECT 1 FROM eventos_servicios es
                        WHERE es.id_evento = c.id_contrato
                          AND es.fecha_evento BETWEEN %s AND %s
                    )
                  )
                """,
                (date_from, date_to, date_from, date_to),
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
                    LEFT JOIN contratos c2 ON c2.id_contrato = ct2.id_contrato AND c2.active = 1
                    LEFT JOIN eventos_servicios es2 ON es2.id_evento_servicio = ct2.id_evento_servicio
                    WHERE t.id_puesto = %s AND t.active = 1
                      AND (
                        COALESCE(DATE(ct2.fecha_inicio), es2.fecha_evento, c2.fecha_evento, DATE(c2.datetime)) BETWEEN %s AND %s
                        OR ct2.id_contrato IS NULL
                      )
                    GROUP BY t.id_trabajador, t.nombre, t.apellido
                    ORDER BY eventos_count DESC, t.nombre ASC
                    """,
                    (id_puesto, date_from, date_to),
                )
                comparacion = cur.fetchall() or []

            for e in eventos:
                for k in ("fecha_evento", "hora_inicio", "hora_final"):
                    v = e.get(k)
                    if v is not None and hasattr(v, "isoformat"):
                        e[k] = v.isoformat()

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


def get_proximos_eventos_trabajador(id_trabajador: int, limit: int = 5) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT
                    c.id_contrato,
                    c.cliente_nombre,
                    COALESCE(DATE(ct.fecha_inicio), es.fecha_evento, c.fecha_evento, DATE(c.datetime)) AS fecha_evento,
                    ct.hora_inicio,
                    ct.hora_final,
                    ct.fecha_inicio,
                    ct.fecha_final,
                    p.nombre AS nombre_puesto_evento
                FROM contratos_trabajadores ct
                JOIN contratos c ON c.id_contrato = ct.id_contrato
                LEFT JOIN eventos_servicios es ON es.id_evento_servicio = ct.id_evento_servicio
                LEFT JOIN puestos p ON p.id_puesto = ct.id_puesto
                WHERE ct.id_trabajador = %s
                  AND ct.active = 1
                  AND c.active = 1
                  AND COALESCE(DATE(ct.fecha_inicio), es.fecha_evento, c.fecha_evento, DATE(c.datetime)) >= CURDATE()
                ORDER BY COALESCE(DATE(ct.fecha_inicio), es.fecha_evento, c.fecha_evento, DATE(c.datetime)) ASC,
                         ct.hora_inicio ASC
                LIMIT %s
                """,
                (id_trabajador, limit),
            )
            rows = cur.fetchall() or []
            for e in rows:
                for k in ("fecha_evento", "hora_inicio", "hora_final", "fecha_inicio", "fecha_final"):
                    v = e.get(k)
                    if v is not None and hasattr(v, "isoformat"):
                        e[k] = v.isoformat()
            return rows
    finally:
        conn.close()


# ================== CONTRATOS TRABAJADORES ==================

def _ensure_ct_horario_cols(conn) -> None:
    with conn.cursor() as cur:
        for col, defn in [
            ("hora_inicio", "VARCHAR(8)"),
            ("hora_final", "VARCHAR(8)"),
            ("fecha_inicio", "DATETIME"),
            ("fecha_final", "DATETIME"),
        ]:
            try:
                cur.execute(
                    f"ALTER TABLE contratos_trabajadores ADD COLUMN {col} {defn} NULL"
                )
            except Exception:
                pass
    conn.commit()


def list_contrato_trabajadores(id_contrato: int) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        _ensure_ct_horario_cols(conn)
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT
                    ct.id_contrato_trabajador,
                    ct.id_contrato,
                    ct.id_trabajador,
                    ct.id_puesto,
                    ct.hora_inicio,
                    ct.hora_final,
                    ct.fecha_inicio,
                    ct.fecha_final,
                    ct.id_evento_servicio,
                    t.nombre AS nombre_trabajador,
                    t.apellido AS apellido_trabajador,
                    t.path AS path_trabajador,
                    p.nombre AS nombre_puesto
                FROM contratos_trabajadores ct
                JOIN trabajadores t ON t.id_trabajador = ct.id_trabajador AND t.active = 1
                LEFT JOIN puestos p ON p.id_puesto = ct.id_puesto
                WHERE ct.id_contrato = %s AND ct.active = 1
                ORDER BY ct.hora_inicio ASC, t.nombre ASC
                """,
                (id_contrato,),
            )
            return cur.fetchall() or []
    finally:
        conn.close()


def get_contrato_trabajador_by_id(id_contrato_trabajador: int) -> Optional[Dict[str, Any]]:
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
                    p.nombre AS nombre_puesto
                FROM contratos_trabajadores ct
                JOIN trabajadores t ON t.id_trabajador = ct.id_trabajador
                LEFT JOIN puestos p ON p.id_puesto = ct.id_puesto
                WHERE ct.id_contrato_trabajador = %s
                LIMIT 1
                """,
                (id_contrato_trabajador,),
            )
            return cur.fetchone()
    finally:
        conn.close()


def is_trabajador_en_contrato(
    id_contrato: int, id_trabajador: int, id_evento_servicio: Optional[int] = None
) -> bool:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            if id_evento_servicio is not None:
                cur.execute(
                    """
                    SELECT 1 FROM contratos_trabajadores
                    WHERE id_contrato = %s AND id_trabajador = %s
                      AND id_evento_servicio = %s AND active = 1
                    LIMIT 1
                    """,
                    (id_contrato, id_trabajador, id_evento_servicio),
                )
            else:
                cur.execute(
                    """
                    SELECT 1 FROM contratos_trabajadores
                    WHERE id_contrato = %s AND id_trabajador = %s
                      AND id_evento_servicio IS NULL AND active = 1
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
    id_cliente: Optional[int] = None,
    hora_inicio: Optional[str] = None,
    hora_final: Optional[str] = None,
    id_evento_servicio: Optional[int] = None,
    fecha_inicio: Optional[str] = None,
    fecha_final: Optional[str] = None,
) -> Dict[str, Any]:
    now = dt.datetime.now()
    # Extrae HH:mm de la fecha si no se envió hora separada
    if fecha_inicio and not hora_inicio:
        hora_inicio = fecha_inicio[11:16] if len(fecha_inicio) >= 16 else None
    if fecha_final and not hora_final:
        hora_final = fecha_final[11:16] if len(fecha_final) >= 16 else None
    conn = get_connection()
    try:
        _ensure_ct_horario_cols(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO contratos_trabajadores
                    (id_contrato, id_trabajador, id_puesto, hora_inicio, hora_final,
                     fecha_inicio, fecha_final,
                     active, datetime, id_user, id_cliente, id_evento_servicio)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 1, %s, %s, %s, %s)
                """,
                (
                    id_contrato, id_trabajador, id_puesto or None,
                    hora_inicio or None, hora_final or None,
                    fecha_inicio or None, fecha_final or None,
                    now, id_user, id_cliente, id_evento_servicio or None,
                ),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id_contrato_trabajador": new_id}
    finally:
        conn.close()


def update_contrato_trabajador_horario(
    id_contrato: int,
    id_contrato_trabajador: int,
    hora_inicio: Optional[str],
    hora_final: Optional[str],
    fecha_inicio: Optional[str] = None,
    fecha_final: Optional[str] = None,
) -> int:
    if fecha_inicio and not hora_inicio:
        hora_inicio = fecha_inicio[11:16] if len(fecha_inicio) >= 16 else None
    if fecha_final and not hora_final:
        hora_final = fecha_final[11:16] if len(fecha_final) >= 16 else None
    conn = get_connection()
    try:
        _ensure_ct_horario_cols(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE contratos_trabajadores
                SET hora_inicio = %s, hora_final = %s,
                    fecha_inicio = %s, fecha_final = %s
                WHERE id_contrato_trabajador = %s AND id_contrato = %s AND active = 1
                """,
                (hora_inicio or None, hora_final or None,
                 fecha_inicio or None, fecha_final or None,
                 id_contrato_trabajador, id_contrato),
            )
            affected = cur.rowcount
        conn.commit()
        return affected
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
