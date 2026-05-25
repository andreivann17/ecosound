from __future__ import annotations
from typing import Any, Dict, List, Optional
from ..db import get_connection
import datetime as dt


# ================== CATEGORIAS ==================

def list_categorias(id_user: Optional[int] = None, id_cliente: Optional[int] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            conditions = ["actve = 1"]
            params: List[Any] = []
            if id_cliente is not None:
                conditions.append("id_cliente = %s")
                params.append(id_cliente)
            elif id_user:
                conditions.append("id_user = %s")
                params.append(id_user)
            where = " AND ".join(conditions)
            cur.execute(f"SELECT * FROM categorias_equipo WHERE {where} ORDER BY nombre ASC", params)
            return cur.fetchall() or []
    finally:
        conn.close()


def create_categoria(data: Dict[str, Any], id_user: int, id_cliente: Optional[int] = None) -> Dict[str, Any]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO categorias_equipo (nombre, actve, id_user, id_cliente) VALUES (%s, 1, %s, %s)",
                (data["nombre"], id_user, id_cliente),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id_categoria_equipo": new_id, "nombre": data["nombre"]}
    finally:
        conn.close()


def update_categoria(id_categoria: int, data: Dict[str, Any]) -> int:
    conn = get_connection()
    try:
        sets = []
        vals = []
        if "nombre" in data:
            sets.append("nombre = %s")
            vals.append(data["nombre"])
        if not sets:
            return 0
        vals.append(id_categoria)
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE categorias_equipo SET {', '.join(sets)} WHERE id_categoria_equipo = %s",
                vals,
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()


def delete_categoria(id_categoria: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE categorias_equipo SET actve = 0 WHERE id_categoria_equipo = %s",
                (id_categoria,),
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()


# ================== EQUIPO ==================

def get_cantidad_sistema(id_equipo: int, conn=None) -> int:
    close_after = conn is None
    if conn is None:
        conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT
                    COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN cantidad ELSE 0 END), 0) AS entradas,
                    COALESCE(SUM(CASE WHEN tipo = 'baja'    THEN cantidad ELSE 0 END), 0) AS bajas
                FROM equipo_movimientos
                WHERE id_equipo = %s
                """,
                (id_equipo,),
            )
            row = cur.fetchone() or {}
        return int(row.get("entradas", 0)) - int(row.get("bajas", 0))
    finally:
        if close_after:
            conn.close()


def list_equipo(
    search: Optional[str] = None,
    id_categoria: Optional[int] = None,
    estado: Optional[str] = None,
    active: int = 1,
    id_cliente: Optional[int] = None,
) -> List[Dict[str, Any]]:
    conditions = ["e.active = %s"]
    params: List[Any] = [active]

    if id_cliente is not None:
        conditions.append("e.id_cliente = %s")
        params.append(id_cliente)

    if search:
        conditions.append("(e.nombre LIKE %s OR e.descripcion LIKE %s)")
        like = f"%{search}%"
        params.extend([like, like])

    if id_categoria:
        conditions.append("e.id_categoria_equipo = %s")
        params.append(id_categoria)

    if estado:
        conditions.append("e.estado = %s")
        params.append(estado)

    where = "WHERE " + " AND ".join(conditions)

    sql = f"""
        SELECT e.*,
               c.nombre AS nombre_categoria,
               COALESCE(
                 (SELECT SUM(CASE WHEN m.tipo = 'entrada' THEN m.cantidad ELSE 0 END) -
                         SUM(CASE WHEN m.tipo = 'baja'    THEN m.cantidad ELSE 0 END)
                  FROM equipo_movimientos m
                  WHERE m.id_equipo = e.id_equipo), 0
               ) AS cantidad_disponible
        FROM equipo e
        LEFT JOIN categorias_equipo c ON c.id_categoria_equipo = e.id_categoria_equipo
        {where}
        ORDER BY c.nombre ASC, e.nombre ASC
    """
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(sql, params)
            return cur.fetchall() or []
    finally:
        conn.close()


def get_equipo_by_id(id_equipo: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT e.*,
                       c.nombre AS nombre_categoria,
                       u.name AS created_by_nombre,
                       COALESCE(
                         (SELECT SUM(CASE WHEN m.tipo = 'entrada' THEN m.cantidad ELSE 0 END) -
                                 SUM(CASE WHEN m.tipo = 'baja'    THEN m.cantidad ELSE 0 END)
                          FROM equipo_movimientos m
                          WHERE m.id_equipo = e.id_equipo), 0
                       ) AS cantidad_disponible
                FROM equipo e
                LEFT JOIN categorias_equipo c ON c.id_categoria_equipo = e.id_categoria_equipo
                LEFT JOIN users u ON u.id_user = e.id_user
                WHERE e.id_equipo = %s
                LIMIT 1
                """,
                (id_equipo,),
            )
            return cur.fetchone()
    finally:
        conn.close()


def create_equipo(data: Dict[str, Any], id_user: int, id_cliente: Optional[int] = None) -> Dict[str, Any]:
    now = dt.datetime.now()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO equipo (nombre, id_categoria_equipo, descripcion, id_user, estado, active, datetime, id_cliente)
                VALUES (%s, %s, %s, %s, %s, 1, %s, %s)
                """,
                (
                    data.get("nombre"),
                    data.get("id_categoria_equipo"),
                    data.get("descripcion") or None,
                    id_user,
                    data.get("estado", "activo"),
                    now,
                    id_cliente,
                ),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id_equipo": new_id}
    finally:
        conn.close()


def update_equipo(id_equipo: int, data: Dict[str, Any]) -> int:
    allowed = {"nombre", "id_categoria_equipo", "descripcion", "estado", "active"}
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return 0
    conn = get_connection()
    try:
        set_clause = ", ".join(f"{k} = %s" for k in updates)
        vals = list(updates.values()) + [id_equipo]
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE equipo SET {set_clause} WHERE id_equipo = %s",
                vals,
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()


def update_equipo_imagen(id_equipo: int, filename: str, path: str) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE equipo SET filena = %s, path = %s WHERE id_equipo = %s",
                (filename, path, int(id_equipo)),
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()


def delete_equipo(id_equipo: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE equipo SET active_sistema = 0 WHERE id_equipo = %s",
                (id_equipo,),
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()


# ================== MOVIMIENTOS ==================

def list_movimientos(id_equipo: int) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT m.*, u.name AS created_by_nombre
                FROM equipo_movimientos m
                LEFT JOIN users u ON u.id_user = m.id_equipo
                WHERE m.id_equipo = %s
                ORDER BY m.fecha_movimiento DESC
                """,
                (id_equipo,),
            )
            return cur.fetchall() or []
    finally:
        conn.close()


def create_movimiento(id_equipo: int, data: Dict[str, Any], id_user: int) -> Dict[str, Any]:
    now = dt.datetime.now()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO equipo_movimientos
                    (id_equipo, tipo, cantidad, motivo, fecha_movimiento, descripcion, datetime)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    id_equipo,
                    data.get("tipo"),
                    data.get("cantidad"),
                    data.get("motivo"),
                    data.get("fecha_movimiento") or now,
                    data.get("descripcion") or None,
                    now,
                ),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id_equipo_movimiento": new_id}
    finally:
        conn.close()


def delete_movimiento(id_movimiento: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM equipo_movimientos WHERE id_equipo_movimiento = %s",
                (id_movimiento,),
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()


# ================== CONTEOS ==================

def list_conteos() -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT ic.*,
                       COUNT(icd.id_conteo_detalle) AS total_equipos,
                       SUM(ABS(icd.diferencia)) AS total_diferencias
                FROM inventario_conteos ic
                LEFT JOIN inventario_conteo_detalle icd ON icd.id_inventario_conteo = ic.id_inventario_conteo
                GROUP BY ic.id_inventario_conteo
                ORDER BY ic.fecha DESC
                """
            )
            return cur.fetchall() or []
    finally:
        conn.close()


def get_conteo_by_id(id_conteo: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT * FROM inventario_conteos WHERE id_inventario_conteo = %s LIMIT 1",
                (id_conteo,),
            )
            conteo = cur.fetchone()
            if not conteo:
                return None
            cur.execute(
                """
                SELECT icd.*, e.nombre AS nombre_equipo, c.nombre AS nombre_categoria
                FROM inventario_conteo_detalle icd
                JOIN equipo e ON e.id_equipo = icd.id_equipo
                LEFT JOIN categorias_equipo c ON c.id_categoria_equipo = e.id_categoria_equipo
                WHERE icd.id_inventario_conteo = %s
                ORDER BY c.nombre ASC, e.nombre ASC
                """,
                (id_conteo,),
            )
            conteo["detalles"] = cur.fetchall() or []
        return conteo
    finally:
        conn.close()


def create_conteo(data: Dict[str, Any], id_user: int) -> Dict[str, Any]:
    now = dt.datetime.now()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO inventario_conteos (fecha, tipo, descripcion, datetime)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    data.get("fecha") or now.date(),
                    data.get("tipo", "mensual"),
                    data.get("descripcion") or None,
                    now,
                ),
            )
            new_id = cur.lastrowid

        equipo_list = list_equipo(active=1)
        for eq in equipo_list:
            cantidad_sis = int(eq.get("cantidad_disponible") or 0)
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO inventario_conteo_detalle
                        (id_inventario_conteo, id_equipo, cantidad_sistema, cantidad_fisica, descripcion, datetime)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (new_id, eq["id_equipo"], cantidad_sis, 0, None, now),
                )

        conn.commit()
        return {"id_inventario_conteo": new_id}
    finally:
        conn.close()


def update_detalle_fisica(id_detalle: int, cantidad_fisica: int, descripcion: Optional[str] = None) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE inventario_conteo_detalle
                SET cantidad_fisica = %s, descripcion = %s
                WHERE id_conteo_detalle = %s
                """,
                (cantidad_fisica, descripcion or None, id_detalle),
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()


def delete_conteo(id_conteo: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM inventario_conteo_detalle WHERE id_inventario_conteo = %s",
                (id_conteo,),
            )
            cur.execute(
                "DELETE FROM inventario_conteos WHERE id_inventario_conteo = %s",
                (id_conteo,),
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()


# ================== ANÁLISIS ==================

def get_equipo_analisis(id_equipo: int, date_from: str, date_to: str) -> Dict[str, Any]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id_categoria_equipo FROM equipo WHERE id_equipo = %s LIMIT 1",
                (id_equipo,),
            )
            eq_row = cur.fetchone()
            id_categoria = eq_row["id_categoria_equipo"] if eq_row else None

            cur.execute(
                """
                SELECT
                    c.id_contrato,
                    c.cliente_nombre,
                    c.fecha_evento,
                    c.hora_inicio,
                    c.hora_final,
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
                FROM (SELECT DISTINCT id_evento FROM evento_equipo WHERE id_equipo = %s) ee
                JOIN contratos c ON c.id_contrato = ee.id_evento
                WHERE c.active = 1
                  AND c.fecha_evento BETWEEN %s AND %s
                ORDER BY c.fecha_evento DESC
                """,
                (id_equipo, date_from, date_to),
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

            tasa_uso_pct = (
                round(eventos_count / total_eventos_negocio * 100, 1)
                if total_eventos_negocio > 0 else 0
            )

            comparacion: List[Dict[str, Any]] = []
            if id_categoria:
                cur.execute(
                    """
                    SELECT
                        e.id_equipo,
                        e.nombre,
                        COUNT(DISTINCT ee2.id_evento) AS eventos_count
                    FROM equipo e
                    LEFT JOIN evento_equipo ee2 ON ee2.id_equipo = e.id_equipo
                    LEFT JOIN contratos c2 ON c2.id_contrato = ee2.id_evento
                        AND c2.active = 1
                        AND c2.fecha_evento BETWEEN %s AND %s
                    WHERE e.id_categoria_equipo = %s AND e.active = 1
                    GROUP BY e.id_equipo, e.nombre
                    ORDER BY eventos_count DESC, e.nombre ASC
                    """,
                    (date_from, date_to, id_categoria),
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
                    "tasa_uso_pct": tasa_uso_pct,
                    "total_eventos_negocio": total_eventos_negocio,
                },
                "eventos": eventos,
                "comparacion_categoria": comparacion,
            }
    finally:
        conn.close()
