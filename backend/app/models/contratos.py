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

def create_contrato(
    data: Dict[str, Any],
    id_user_created: int,
    conn,
) -> Dict[str, Any]:
    """
    Inserta un contrato. Devuelve {id_contrato, code}.
    Debe llamarse dentro de una transacción activa.
    """
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
            datetime,
            code,
            active
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1
        )
    """
    with conn.cursor() as cur:
        cur.execute(sql, (
            id_user_created,
            data.get("id_tipo_evento"),
            data.get("cliente_nombre", ""),
            data.get("domicilio") or None,
            data.get("celular", ""),
            data.get("fecha_evento"),
            data.get("lugar_evento", ""),
            data.get("hora_inicio"),
            data.get("hora_final"),
            data.get("importe", ""),
            data.get("id_ciudad", ""),
            data.get("fecha_anticipo"),
            data.get("importe_anticipo", ""),
            data.get("comentarios") or None,
            data.get("direccion_misa") or None,
            data.get("hora_misa") or None,
            now,
            "",            # placeholder — se actualiza abajo con el id real
        ))
        new_id = cur.lastrowid

    # generar code único de 12 chars alfanuméricos
    code = _get_unique_code()
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE contratos SET code = %s WHERE id_contrato = %s",
            (code, new_id),
        )

    return {"id_contrato": new_id, "code": code}


def get_contrato_by_id(id_contrato) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT c.*,
                       u.name AS created_by_nombre
                FROM contratos c
                LEFT JOIN users u ON u.id_user = c.id_user
                WHERE c.id_contrato = %s
                LIMIT 1
                """,
                (int(id_contrato),),
            )
            return cur.fetchone()
    finally:
        conn.close()


def list_contratos(
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
        conditions.append("c.active = %s")
        params.append(active)

    if cliente_nombre:
        conditions.append("c.cliente_nombre LIKE %s")
        params.append(f"%{cliente_nombre}%")

    if search:
        conditions.append(
            "(c.code LIKE %s OR c.cliente_nombre LIKE %s OR c.lugar_evento LIKE %s)"
        )
        like = f"%{search}%"
        params.extend([like, like, like])

    if date_from:
        conditions.append("c.fecha_evento >= %s")
        params.append(date_from)

    if date_to:
        conditions.append("c.fecha_evento <= %s")
        params.append(date_to)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    sql = f"""
        SELECT c.*,
               COALESCE((
                   SELECT SUM(CAST(ca.importe AS DECIMAL(12,2)))
                   FROM contratos_abonos ca
                   WHERE ca.id_contrato = c.id_contrato AND ca.active = 1
               ), 0) AS total_abonos
        FROM contratos c
        {where}
        ORDER BY c.fecha_evento DESC
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


def update_contrato(
    id_contrato,
    data: Dict[str, Any],
    conn,
) -> Tuple[int, Optional[str]]:
    """
    Actualiza campos permitidos. Devuelve (rows_affected, code).
    """
    allowed = {
        "cliente_nombre", "domicilio", "celular", "fecha_evento", "lugar_evento",
        "hora_inicio", "hora_final", "importe", "fecha_anticipo",
        "importe_anticipo", "id_tipo_evento", "id_ciudad", "comentarios",
        "direccion_misa", "hora_misa",
    }
    # Incluir campos aunque sean None explícito (para poder borrar valores)
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return 0, None

    set_clause = ", ".join(f"{k} = %s" for k in updates)
    vals = list(updates.values()) + [int(id_contrato)]

    with conn.cursor() as cur:
        cur.execute(
            f"UPDATE contratos SET {set_clause} WHERE id_contrato = %s",
            vals,
        )
        affected = cur.rowcount

    # recuperar code actual
    with conn.cursor(dictionary=True) as cur:
        cur.execute(
            "SELECT code FROM contratos WHERE id_contrato = %s LIMIT 1",
            (int(id_contrato),),
        )
        row = cur.fetchone()

    code = (row or {}).get("code")
    return affected, code


def get_contratos_abonos(id_contrato: int) -> List[Dict[str, Any]]:
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
                (id_contrato,),
            )
            return cur.fetchall() or []
    finally:
        conn.close()


def create_contrato_abono(
    id_contrato: int,
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
                (importe, fecha, id_user, id_contrato),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id": new_id, "monto": importe, "fecha": fecha}
    finally:
        conn.close()


def delete_contrato_abono(id_contrato: int, id_abono: int) -> Optional[Dict[str, Any]]:
    """Marca un abono como inactivo. Devuelve el row antes de eliminarlo o None si no existe."""
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
                (id_abono, id_contrato),
            )
            row = cur.fetchone()
        if not row:
            return None
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE contratos_abonos SET active = 0 WHERE id_contrato_abono = %s AND id_contrato = %s",
                (id_abono, id_contrato),
            )
        conn.commit()
        return row
    finally:
        conn.close()


def cards_contrato(
    cliente_nombre: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    active: Optional[int] = 1,
    search: Optional[str] = None,
) -> List[Dict[str, Any]]:
    return list_contratos(
        cliente_nombre=cliente_nombre,
        date_from=date_from,
        date_to=date_to,
        active=active,
        search=search,
    )
