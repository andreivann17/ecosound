from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
from ..db import get_connection
import datetime as dt
import string
import secrets

# ================== HELPERS ==================

_ALPHANUM = string.ascii_uppercase + string.digits

def _generate_code(n: int = 12) -> str:
    return "".join(secrets.choice(_ALPHANUM) for _ in range(n))

def _get_unique_code() -> str:
    return _generate_code(12)


# ================== CRUD ==================
# Nota: la tabla en BD sigue llamándose "contratos" / "contratos_abonos" /
# "contratos_documentos" con PK "id_contrato". Se devuelve la clave como
# "id_evento" mediante alias SQL para que el frontend no cambie.

def create_evento(
    data: Dict[str, Any],
    id_user_created: int,
    conn,
) -> Dict[str, Any]:
    now = dt.datetime.now()
    sql = """
        INSERT INTO contratos (
            id_user,
            id_tipo_evento,
            cliente_nombre,
            domicilio,
            celular,
            fecha_evento,
            lugar_evento,
            hora_inicio,
            hora_final,
            importe,
            id_ciudad,
            fecha_anticipo,
            importe_anticipo,
            comentarios,
            direccion_misa,
            hora_misa,
            id_paquete_sonido,
            id_paquete_fotografia,
            id_ciudad_fotografia,
            lugar_fotografia,
            datetime_fotografia,
            comentarios_fotografia,
            fecha_creacion_contrato,
            datetime,
            code,
            active
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1
        )
    """
    with conn.cursor() as cur:
        cur.execute(sql, (
            id_user_created,
            data.get("id_tipo_evento"),
            data.get("cliente_nombre", ""),
            data.get("domicilio") or None,
            data.get("celular") or "",
            data.get("fecha_evento"),
            data.get("lugar_evento") or "",
            data.get("hora_inicio"),
            data.get("hora_final"),
            data.get("importe", ""),
            data.get("id_ciudad") or None,
            data.get("fecha_anticipo"),
            data.get("importe_anticipo", ""),
            data.get("comentarios") or None,
            data.get("direccion_misa") or None,
            data.get("hora_misa") or None,
            data.get("id_paquete_sonido") or None,
            data.get("id_paquete_fotografia") or None,
            data.get("id_ciudad_fotografia") or None,
            data.get("lugar_fotografia") or None,
            data.get("datetime_fotografia") or None,
            data.get("comentarios_fotografia") or None,
            data.get("fecha_creacion_contrato") or None,
            now,
            "",
        ))
        new_id = cur.lastrowid

    code = _get_unique_code()
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE contratos SET code = %s WHERE id_contrato = %s",
            (code, new_id),
        )

    return {"id_evento": new_id, "code": code}


def get_evento_by_id(id_evento) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT e.*, e.id_contrato AS id_evento,
                       u.name AS created_by_nombre,
                       c.nombre AS nombre_ciudad,
                       ps.nombre AS nombre_paquete_sonido,
                       pf.nombre AS nombre_paquete_fotografia
                FROM contratos e
                LEFT JOIN users u ON u.id_user = e.id_user
                LEFT JOIN ciudades c ON c.id_ciudad = e.id_ciudad
                LEFT JOIN paquetes_sonido ps ON ps.id_paquete_sonido = e.id_paquete_sonido
                LEFT JOIN paquetes_fotografia pf ON pf.id_paquete_fotografia = e.id_paquete_fotografia
                WHERE e.id_contrato = %s
                LIMIT 1
                """,
                (int(id_evento),),
            )
            return cur.fetchone()
    finally:
        conn.close()


def list_eventos(
    cliente_nombre: Optional[str] = None,
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
        conditions.append("e.active = %s")
        params.append(active)

    if cliente_nombre:
        conditions.append("e.cliente_nombre LIKE %s")
        params.append(f"%{cliente_nombre}%")

    if search:
        conditions.append(
            "(e.code LIKE %s OR e.cliente_nombre LIKE %s OR e.lugar_evento LIKE %s)"
        )
        like = f"%{search}%"
        params.extend([like, like, like])

    if date_from:
        conditions.append("e.fecha_evento >= %s")
        params.append(date_from)

    if date_to:
        conditions.append("e.fecha_evento <= %s")
        params.append(date_to)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    sql = f"""
        SELECT e.*, e.id_contrato AS id_evento,
               COALESCE((
                   SELECT SUM(CAST(ea.importe AS DECIMAL(12,2)))
                   FROM contratos_abonos ea
                   WHERE ea.id_contrato = e.id_contrato AND ea.active = 1
               ), 0) AS total_abonos
        FROM contratos e
        {where}
        ORDER BY e.fecha_evento DESC
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


def update_evento(
    id_evento,
    data: Dict[str, Any],
    conn,
) -> Tuple[int, Optional[str]]:
    allowed = {
        "cliente_nombre", "domicilio", "celular", "fecha_evento", "lugar_evento",
        "hora_inicio", "hora_final", "importe", "fecha_anticipo",
        "importe_anticipo", "id_tipo_evento", "id_ciudad", "comentarios",
        "direccion_misa", "hora_misa",
        "id_paquete_sonido", "id_paquete_fotografia",
        "id_ciudad_fotografia", "lugar_fotografia", "datetime_fotografia", "comentarios_fotografia",
        "fecha_creacion_contrato",
    }
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return 0, None

    set_clause = ", ".join(f"{k} = %s" for k in updates)
    vals = list(updates.values()) + [int(id_evento)]

    with conn.cursor() as cur:
        cur.execute(
            f"UPDATE contratos SET {set_clause} WHERE id_contrato = %s",
            vals,
        )
        affected = cur.rowcount

    with conn.cursor(dictionary=True) as cur:
        cur.execute(
            "SELECT code FROM contratos WHERE id_contrato = %s LIMIT 1",
            (int(id_evento),),
        )
        row = cur.fetchone()

    code = (row or {}).get("code")
    return affected, code


def get_eventos_abonos(id_evento: int) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT id_contrato_abono AS id, importe AS monto, fecha
                FROM contratos_abonos
                WHERE id_contrato = %s AND active = 1
                ORDER BY fecha ASC
                """,
                (id_evento,),
            )
            return cur.fetchall() or []
    finally:
        conn.close()


def create_evento_abono(
    id_evento: int,
    id_user: int,
    importe: str,
    fecha: dt.datetime,
) -> Dict[str, Any]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO contratos_abonos (importe, fecha, active, id_user, id_contrato)
                VALUES (%s, %s, 1, %s, %s)
                """,
                (importe, fecha, id_user, id_evento),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id": new_id, "monto": importe, "fecha": fecha}
    finally:
        conn.close()


def delete_evento_abono(id_evento: int, id_abono: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT id_contrato_abono AS id, importe AS monto, fecha
                FROM contratos_abonos
                WHERE id_contrato_abono = %s AND id_contrato = %s AND active = 1
                LIMIT 1
                """,
                (id_abono, id_evento),
            )
            row = cur.fetchone()
        if not row:
            return None
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE contratos_abonos SET active = 0 WHERE id_contrato_abono = %s AND id_contrato = %s",
                (id_abono, id_evento),
            )
        conn.commit()
        return row
    finally:
        conn.close()


def cards_evento(
    cliente_nombre: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    active: Optional[int] = 1,
    search: Optional[str] = None,
) -> List[Dict[str, Any]]:
    return list_eventos(
        cliente_nombre=cliente_nombre,
        date_from=date_from,
        date_to=date_to,
        active=active,
        search=search,
    )


# ================== EVENTO EQUIPO ==================

def list_evento_equipo(id_evento: int) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT
                    ee.id_contrato_equipo,
                    ee.id_contrato,
                    ee.id_equipo,
                    ee.cantidad,
                    ee.fecha_salida,
                    ee.fecha_regreso,
                    ee.regreso_confirmado,
                    ee.descripcion,
                    e.nombre  AS nombre_equipo,
                    e.estado  AS estado_equipo,
                    e.path    AS path_equipo,
                    c.nombre  AS nombre_categoria
                FROM contratos_equipos ee
                JOIN equipo e ON e.id_equipo = ee.id_equipo
                LEFT JOIN categorias_equipo c ON c.id_categoria_equipo = e.id_categoria_equipo
                WHERE ee.id_contrato = %s
                ORDER BY c.nombre ASC, e.nombre ASC
                """,
                (id_evento,),
            )
            rows = cur.fetchall() or []
        for r in rows:
            for k in ("fecha_salida", "fecha_regreso", "datetime"):
                if hasattr(r.get(k), "isoformat"):
                    r[k] = r[k].isoformat()
        return rows
    finally:
        conn.close()


def get_catalogo_con_disponibilidad(id_evento: int, fecha_salida: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT
                    e.id_equipo,
                    e.nombre,
                    e.estado,
                    e.id_categoria_equipo,
                    c.nombre AS nombre_categoria,
                    COALESCE((
                        SELECT SUM(CASE WHEN em.tipo='entrada' THEN em.cantidad ELSE 0 END) -
                               SUM(CASE WHEN em.tipo='baja'    THEN em.cantidad ELSE 0 END)
                        FROM equipo_movimientos em WHERE em.id_equipo = e.id_equipo
                    ), 0) AS cantidad_stock,
                    COALESCE((
                        SELECT SUM(ee.cantidad)
                        FROM contratos_equipos ee
                        WHERE ee.id_equipo  = e.id_equipo
                          AND ee.id_contrato != %s
                          AND ee.fecha_salida <= %s
                          AND ee.fecha_regreso >= %s
                    ), 0) AS cantidad_comprometida
                FROM equipo e
                LEFT JOIN categorias_equipo c ON c.id_categoria_equipo = e.id_categoria_equipo
                WHERE e.active = 1 AND e.estado = 'activo'
                ORDER BY c.nombre ASC, e.nombre ASC
                """,
                (id_evento, fecha_salida, fecha_salida),
            )
            rows = cur.fetchall() or []
        for r in rows:
            stock = int(r.get("cantidad_stock") or 0)
            comprometido = int(r.get("cantidad_comprometida") or 0)
            r["cantidad_disponible"] = max(0, stock - comprometido)
        return rows
    finally:
        conn.close()


def get_disponibilidad_equipo(id_equipo: int, fecha_salida: str, id_evento: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT COALESCE(
                    SUM(CASE WHEN tipo='entrada' THEN cantidad ELSE 0 END) -
                    SUM(CASE WHEN tipo='baja'    THEN cantidad ELSE 0 END), 0
                ) AS stock
                FROM equipo_movimientos WHERE id_equipo = %s
                """,
                (id_equipo,),
            )
            stock = int((cur.fetchone() or {}).get("stock", 0))
            cur.execute(
                """
                SELECT COALESCE(SUM(cantidad), 0) AS comprometido
                FROM contratos_equipos
                WHERE id_equipo   = %s
                  AND id_contrato != %s
                  AND fecha_salida <= %s
                  AND fecha_regreso >= %s
                """,
                (id_equipo, id_evento, fecha_salida, fecha_salida),
            )
            comprometido = int((cur.fetchone() or {}).get("comprometido", 0))
        return max(0, stock - comprometido)
    finally:
        conn.close()


def add_evento_equipo(id_evento: int, data: Dict[str, Any]) -> Dict[str, Any]:
    now = dt.datetime.now()
    fecha_salida = data.get("fecha_salida") or now
    fecha_regreso = data.get("fecha_regreso") or fecha_salida
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO contratos_equipos
                    (id_contrato, id_equipo, cantidad, fecha_salida, fecha_regreso, descripcion, datetime)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    id_evento,
                    data["id_equipo"],
                    data.get("cantidad", 1),
                    fecha_salida,
                    fecha_regreso,
                    data.get("descripcion") or None,
                    now,
                ),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id_contrato_equipo": new_id}
    finally:
        conn.close()


def delete_evento_equipo(id_contrato_equipo: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM contratos_equipos WHERE id_contrato_equipo = %s",
                (id_contrato_equipo,),
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()
