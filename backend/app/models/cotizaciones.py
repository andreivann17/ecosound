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
# Nota: la tabla en BD sigue llamándose "cotizaciones" / "cotizaciones_abonos" /
# "cotizaciones_documentos" con PK "id_cotizacion". Se devuelve la clave como
# "id_cotizacion" mediante alias SQL para que el frontend no cambie.

def create_evento(
    data: Dict[str, Any],
    id_user_created: int,
    conn,
    id_cliente: Optional[int] = None,
) -> Dict[str, Any]:
    now = dt.datetime.now()
    sql = """
        INSERT INTO cotizaciones (
            folio,
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
            id_cliente,
            active
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1
        )
    """
    with conn.cursor() as cur:
        cur.execute(sql, (
            data.get("folio") or None,
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
            id_cliente,
        ))
        new_id = cur.lastrowid

    code = _get_unique_code()
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE cotizaciones SET code = %s WHERE id_cotizacion = %s",
            (code, new_id),
        )

    return {"id_cotizacion": new_id, "code": code}


def get_evento_by_id(id_cotizacion) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT e.*, e.id_cotizacion AS id_cotizacion,
                       u.name AS created_by_nombre,
                       c.nombre AS nombre_ciudad,
                       ps.nombre AS nombre_paquete_sonido,
                       pf.nombre AS nombre_paquete_fotografia
                FROM cotizaciones e
                LEFT JOIN users u ON u.id_user = e.id_user
                LEFT JOIN ciudades c ON c.id_ciudad = e.id_ciudad
                LEFT JOIN paquetes_sonido ps ON ps.id_paquete_sonido = e.id_paquete_sonido
                LEFT JOIN paquetes_fotografia pf ON pf.id_paquete_fotografia = e.id_paquete_fotografia
                WHERE e.id_cotizacion = %s
                LIMIT 1
                """,
                (int(id_cotizacion),),
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
    id_cliente: Optional[int] = None,
) -> List[Dict[str, Any]]:
    conditions = []
    params: List[Any] = []
    print("----")
    print(id_cliente)

    if id_cliente is not None:
        conditions.append("e.id_cliente = %s")
        params.append(id_cliente)

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
        SELECT e.*, e.id_cotizacion AS id_cotizacion,
               COALESCE((
                   SELECT SUM(CAST(ea.importe AS DECIMAL(12,2)))
                   FROM cotizaciones_abonos ea
                   WHERE ea.id_cotizacion = e.id_cotizacion AND ea.active = 1
               ), 0) AS total_abonos,
               (
                   SELECT GROUP_CONCAT(DISTINCT cs.id_servicio ORDER BY cs.id_servicio)
                   FROM cotizaciones_servicios cs
                   WHERE cs.id_cotizacion = e.id_cotizacion
               ) AS servicios_ids
        FROM cotizaciones e
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
    id_cotizacion,
    data: Dict[str, Any],
    conn,
) -> Tuple[int, Optional[str]]:
    allowed = {
        "folio", "estado",
        "cliente_nombre", "domicilio", "celular", "fecha_evento", "lugar_evento",
        "hora_inicio", "hora_final", "importe",
        "id_tipo_evento", "id_ciudad", "comentarios",
        "direccion_misa", "hora_misa",
        "id_paquete_sonido", "id_paquete_fotografia",
        "id_ciudad_fotografia", "lugar_fotografia", "datetime_fotografia", "comentarios_fotografia",
        "fecha_creacion_contrato",
    }
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return 0, None

    set_clause = ", ".join(f"{k} = %s" for k in updates)
    vals = list(updates.values()) + [int(id_cotizacion)]

    with conn.cursor() as cur:
        cur.execute(
            f"UPDATE cotizaciones SET {set_clause} WHERE id_cotizacion = %s",
            vals,
        )
        affected = cur.rowcount

    with conn.cursor(dictionary=True) as cur:
        cur.execute(
            "SELECT code FROM cotizaciones WHERE id_cotizacion = %s LIMIT 1",
            (int(id_cotizacion),),
        )
        row = cur.fetchone()

    code = (row or {}).get("code")
    return affected, code


def get_eventos_abonos(id_cotizacion: int) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT id_cotizacion_abono AS id, importe AS monto, fecha
                FROM cotizaciones_abonos
                WHERE id_cotizacion = %s AND active = 1
                ORDER BY fecha ASC
                """,
                (id_cotizacion,),
            )
            return cur.fetchall() or []
    finally:
        conn.close()


def create_evento_abono(
    id_cotizacion: int,
    id_user: int,
    importe: str,
    fecha: dt.datetime,
    id_cliente: Optional[int] = None,
) -> Dict[str, Any]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO cotizaciones_abonos (importe, fecha, active, id_user, id_cotizacion, id_cliente)
                VALUES (%s, %s, 1, %s, %s, %s)
                """,
                (importe, fecha, id_user, id_cotizacion, id_cliente),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id": new_id, "monto": importe, "fecha": fecha}
    finally:
        conn.close()


def delete_evento_abono(id_cotizacion: int, id_abono: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT id_cotizacion_abono AS id, importe AS monto, fecha
                FROM cotizaciones_abonos
                WHERE id_cotizacion_abono = %s AND id_cotizacion = %s AND active = 1
                LIMIT 1
                """,
                (id_abono, id_cotizacion),
            )
            row = cur.fetchone()
        if not row:
            return None
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE cotizaciones_abonos SET active = 0 WHERE id_cotizacion_abono = %s AND id_cotizacion = %s",
                (id_abono, id_cotizacion),
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
    id_cliente: Optional[int] = None,
) -> List[Dict[str, Any]]:
    return list_eventos(
        cliente_nombre=cliente_nombre,
        date_from=date_from,
        date_to=date_to,
        active=active,
        search=search,
        id_cliente=id_cliente,
    )


# ================== EVENTO EQUIPO ==================

def list_evento_equipo(id_cotizacion: int) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT
                    ee.id_cotizacion_equipo,
                    ee.id_cotizacion,
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
                FROM cotizaciones_equipos ee
                JOIN equipo e ON e.id_equipo = ee.id_equipo
                LEFT JOIN categorias_equipo c ON c.id_categoria_equipo = e.id_categoria_equipo
                WHERE ee.id_cotizacion = %s
                ORDER BY c.nombre ASC, e.nombre ASC
                """,
                (id_cotizacion,),
            )
            rows = cur.fetchall() or []
        for r in rows:
            for k in ("fecha_salida", "fecha_regreso", "datetime"):
                if hasattr(r.get(k), "isoformat"):
                    r[k] = r[k].isoformat()
        return rows
    finally:
        conn.close()


def get_catalogo_con_disponibilidad(id_cotizacion: int, fecha_salida: str) -> List[Dict[str, Any]]:
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
                        FROM cotizaciones_equipos ee
                        WHERE ee.id_equipo  = e.id_equipo
                          AND ee.id_cotizacion != %s
                          AND ee.fecha_salida <= %s
                          AND ee.fecha_regreso >= %s
                    ), 0) AS cantidad_comprometida
                FROM equipo e
                LEFT JOIN categorias_equipo c ON c.id_categoria_equipo = e.id_categoria_equipo
                WHERE e.active = 1 AND e.estado = 'activo'
                ORDER BY c.nombre ASC, e.nombre ASC
                """,
                (id_cotizacion, fecha_salida, fecha_salida),
            )
            rows = cur.fetchall() or []
        for r in rows:
            stock = int(r.get("cantidad_stock") or 0)
            comprometido = int(r.get("cantidad_comprometida") or 0)
            r["cantidad_disponible"] = max(0, stock - comprometido)
        return rows
    finally:
        conn.close()


def get_disponibilidad_equipo(id_equipo: int, fecha_salida: str, id_cotizacion: int) -> int:
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
                FROM cotizaciones_equipos
                WHERE id_equipo   = %s
                  AND id_cotizacion != %s
                  AND fecha_salida <= %s
                  AND fecha_regreso >= %s
                """,
                (id_equipo, id_cotizacion, fecha_salida, fecha_salida),
            )
            comprometido = int((cur.fetchone() or {}).get("comprometido", 0))
        return max(0, stock - comprometido)
    finally:
        conn.close()


def add_evento_equipo(id_cotizacion: int, data: Dict[str, Any]) -> Dict[str, Any]:
    now = dt.datetime.now()
    fecha_salida = data.get("fecha_salida") or now
    fecha_regreso = data.get("fecha_regreso") or fecha_salida
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO cotizaciones_equipos
                    (id_cotizacion, id_equipo, cantidad, fecha_salida, fecha_regreso, descripcion, datetime, id_cliente)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    id_cotizacion,
                    data["id_equipo"],
                    data.get("cantidad", 1),
                    fecha_salida,
                    fecha_regreso,
                    data.get("descripcion") or None,
                    now,
                    data.get("id_cliente"),
                ),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id_cotizacion_equipo": new_id}
    finally:
        conn.close()


def delete_evento_equipo(id_cotizacion_equipo: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM cotizaciones_equipos WHERE id_cotizacion_equipo = %s",
                (id_cotizacion_equipo,),
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()


# ================== COTIZACION TRABAJADORES ==================
# Funciones autocontenidas (clonadas de models/trabajadores.py) que operan
# sobre la tabla propia `cotizaciones_trabajadores` para no mezclar con eventos.

def list_contrato_trabajadores(id_cotizacion: int) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT
                    ct.id_cotizacion_trabajador AS id_contrato_trabajador,
                    ct.id_cotizacion,
                    ct.id_trabajador,
                    ct.id_puesto,
                    t.nombre AS nombre_trabajador,
                    t.apellido AS apellido_trabajador,
                    t.path AS path_trabajador,
                    p.nombre AS nombre_puesto
                FROM cotizaciones_trabajadores ct
                JOIN trabajadores t ON t.id_trabajador = ct.id_trabajador AND t.active = 1
                LEFT JOIN puestos p ON p.id_puesto = ct.id_puesto
                WHERE ct.id_cotizacion = %s AND ct.active = 1
                ORDER BY t.nombre ASC
                """,
                (id_cotizacion,),
            )
            return cur.fetchall() or []
    finally:
        conn.close()


def is_trabajador_en_contrato(id_cotizacion: int, id_trabajador: int) -> bool:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT 1 FROM cotizaciones_trabajadores
                WHERE id_cotizacion = %s AND id_trabajador = %s AND active = 1
                LIMIT 1
                """,
                (id_cotizacion, id_trabajador),
            )
            return cur.fetchone() is not None
    finally:
        conn.close()


def add_contrato_trabajador(
    id_cotizacion: int,
    id_trabajador: int,
    id_puesto: Optional[int],
    id_user: int,
    id_cliente: Optional[int] = None,
) -> Dict[str, Any]:
    now = dt.datetime.now()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO cotizaciones_trabajadores
                    (id_cotizacion, id_trabajador, id_puesto, active, datetime, id_user, id_cliente)
                VALUES (%s, %s, %s, 1, %s, %s, %s)
                """,
                (id_cotizacion, id_trabajador, id_puesto or None, now, id_user, id_cliente),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id_contrato_trabajador": new_id}
    finally:
        conn.close()


def delete_contrato_trabajador(id_cotizacion: int, id_contrato_trabajador: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE cotizaciones_trabajadores SET active = 0
                WHERE id_cotizacion_trabajador = %s AND id_cotizacion = %s AND active = 1
                """,
                (id_contrato_trabajador, id_cotizacion),
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()
