from __future__ import annotations
from typing import Any, Dict, List, Optional
from ..db import get_connection

# tipo: 0=Fotografía, 1=Sonido, 2=Banquete, 3=Barra
_TIPO: Dict[int, tuple] = {
    0: ("paquetes_fotografia", "id_paquete_fotografia"),
    1: ("paquetes_sonido",     "id_paquete_sonido"),
    2: ("paquetes_banquete",   "id_paquete_banquete"),
    3: ("paquetes_barra",      "id_paquete_barra"),
}

_TIPO_STR: Dict[str, int] = {
    "fotografia": 0,
    "sonido":     1,
    "banquete":   2,
    "barra":      3,
}

# Columns in `contratos` for existing types (2 and 3 not yet linked)
_TIPO_CONTRATO_COL: Dict[int, str] = {
    0: "id_paquete_fotografia",
    1: "id_paquete_sonido",
}


def list_paquetes(tipo: Optional[str] = None, search: Optional[str] = None, id_cliente: Optional[int] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        tipo_num = _TIPO_STR.get(tipo) if tipo else None
        rows: List[Dict[str, Any]] = []
        with conn.cursor(dictionary=True) as cur:
            for tipo_id, (table, pk) in _TIPO.items():
                if tipo_num is not None and tipo_num != tipo_id:
                    continue
                cond = "p.active_sistema = 1"
                params: List[Any] = []
                if id_cliente is not None:
                    cond += " AND p.id_cliente = %s"
                    params.append(id_cliente)
                if search:
                    cond += " AND p.nombre LIKE %s"
                    params.append(f"%{search}%")
                cur.execute(
                    f"""
                    SELECT p.{pk} AS id_paquete, p.nombre, p.active,
                        {tipo_id} AS is_paquete_sonido,
                        (SELECT COUNT(*) FROM paquetes_contenido pc
                         WHERE pc.id_paquete = p.{pk}
                           AND pc.is_paquete_sonido = {tipo_id} AND pc.active = 1) AS contenidos_count
                    FROM {table} p
                    WHERE {cond}
                    ORDER BY p.nombre ASC
                    """,
                    params,
                )
                rows += cur.fetchall() or []
        return rows
    finally:
        conn.close()


def get_paquete_by_id(id_paquete: int, tipo: int) -> Optional[Dict[str, Any]]:
    if tipo not in _TIPO:
        return None
    table, pk = _TIPO[tipo]
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                f"""
                SELECT {pk} AS id_paquete, nombre, active, active_sistema,
                    {tipo} AS is_paquete_sonido, id_cliente
                FROM {table} WHERE {pk} = %s AND active_sistema = 1 LIMIT 1
                """,
                (id_paquete,),
            )
            row = cur.fetchone()
            if not row:
                return None
            cur.execute(
                """
                SELECT id_paquete_contenido, descripcion
                FROM paquetes_contenido
                WHERE id_paquete = %s AND is_paquete_sonido = %s AND active = 1
                ORDER BY id_paquete_contenido ASC
                """,
                (id_paquete, tipo),
            )
            row["contenidos"] = cur.fetchall() or []
        return row
    finally:
        conn.close()


def create_paquete(nombre: str, tipo: int, id_cliente: Optional[int] = None) -> Dict[str, Any]:
    if tipo not in _TIPO:
        raise ValueError(f"Tipo inválido: {tipo}")
    table, pk = _TIPO[tipo]
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"INSERT INTO {table} (nombre, active, active_sistema, id_cliente) VALUES (%s, 1, 1, %s)",
                (nombre.strip(), id_cliente),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id_paquete": new_id, "is_paquete_sonido": tipo}
    finally:
        conn.close()


def update_paquete(id_paquete: int, tipo: int, data: Dict[str, Any]) -> int:
    if tipo not in _TIPO:
        return 0
    table, pk = _TIPO[tipo]
    allowed = {"nombre", "active"}
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return 0
    conn = get_connection()
    try:
        set_clause = ", ".join(f"{k} = %s" for k in updates)
        vals = list(updates.values()) + [id_paquete]
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {table} SET {set_clause} WHERE {pk} = %s AND active_sistema = 1",
                vals,
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()


def delete_paquete(id_paquete: int, tipo: int) -> int:
    if tipo not in _TIPO:
        return 0
    table, pk = _TIPO[tipo]
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {table} SET active_sistema = 0 WHERE {pk} = %s",
                (id_paquete,),
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()


def add_contenido(id_paquete: int, tipo: int, descripcion: str, id_cliente: Optional[int] = None) -> Dict[str, Any]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO paquetes_contenido (is_paquete_sonido, descripcion, id_paquete, active, id_cliente)
                VALUES (%s, %s, %s, 1, %s)
                """,
                (tipo, descripcion.strip(), id_paquete, id_cliente),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id_paquete_contenido": new_id, "descripcion": descripcion.strip()}
    finally:
        conn.close()


def delete_contenido(id_contenido: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE paquetes_contenido SET active = 0 WHERE id_paquete_contenido = %s",
                (id_contenido,),
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()


# ================== ANALISIS PAQUETE ==================

def get_paquete_analisis(
    id_paquete: int,
    tipo: int,
    date_from: str,
    date_to: str,
    date_field: str = "fecha_evento",
) -> Dict[str, Any]:
    if date_field not in ("fecha_evento", "fecha_creacion_contrato"):
        date_field = "fecha_evento"

    # Análisis linked to contratos only for tipos 0 and 1 (existing columns)
    if tipo not in _TIPO_CONTRATO_COL:
        return {"stats": {"eventos_count": 0, "total_horas": 0, "tasa_pct": 0, "total_eventos_negocio": 0}, "eventos": [], "comparacion_tipo": []}

    col   = _TIPO_CONTRATO_COL[tipo]
    table, pk = _TIPO[tipo]

    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                f"""
                SELECT
                    c.id_contrato,
                    c.cliente_nombre,
                    c.fecha_evento,
                    c.fecha_creacion_contrato,
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
                FROM contratos c
                WHERE c.{col} = %s
                  AND c.active = 1
                  AND c.{date_field} BETWEEN %s AND %s
                ORDER BY c.{date_field} DESC
                """,
                (id_paquete, date_from, date_to),
            )
            eventos = cur.fetchall() or []

            eventos_count = len(eventos)
            total_horas = sum(float(e.get("duracion_horas") or 0) for e in eventos)

            cur.execute(
                f"""
                SELECT COUNT(*) AS total FROM contratos
                WHERE active = 1 AND {date_field} BETWEEN %s AND %s
                """,
                (date_from, date_to),
            )
            total_row = cur.fetchone()
            total_eventos_negocio = int(total_row["total"]) if total_row else 0

            tasa_pct = (
                round(eventos_count / total_eventos_negocio * 100, 1)
                if total_eventos_negocio > 0 else 0
            )

            cur.execute(
                f"""
                SELECT
                    p.{pk} AS id_paquete,
                    p.nombre,
                    COUNT(DISTINCT c2.id_contrato) AS eventos_count
                FROM {table} p
                LEFT JOIN contratos c2 ON c2.{col} = p.{pk}
                    AND c2.active = 1
                    AND c2.{date_field} BETWEEN %s AND %s
                WHERE p.active_sistema = 1
                GROUP BY p.{pk}, p.nombre
                ORDER BY eventos_count DESC, p.nombre ASC
                """,
                (date_from, date_to),
            )
            comparacion = cur.fetchall() or []

            for e in eventos:
                for k in ("fecha_evento", "fecha_creacion_contrato", "hora_inicio", "hora_final"):
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
                "comparacion_tipo": comparacion,
            }
    finally:
        conn.close()
