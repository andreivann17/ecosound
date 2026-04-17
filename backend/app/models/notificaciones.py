# models/notificaciones.py
from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import datetime as dt

from ..db import get_connection

# =============================
# Helpers / Constantes
# =============================
NOTIFICACIONES_ALLOWED_COLS = {
    "active",
    "id_tipo_notificacion",
    "datetime",
    "id_modulo",
    "descripcion",
    "id_user",
    "urgente",
    "fecha_notificacion",
    "leido",
}


def _trim(s: Optional[str]) -> Optional[str]:
    if s is None:
        return None
    return s.strip() if isinstance(s, str) else s


def _to_int_or_none(v: Any) -> Optional[int]:
    if v is None:
        return None
    try:
        return int(v)
    except Exception:
        return None


def _to_mysql_datetime(v: Any) -> Optional[str]:
    if v is None:
        return None
    if isinstance(v, dt):
        return v.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(v, str):
        s = v.strip()
        return s if s else None
    return None


def _sanitize_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}

    for k in NOTIFICACIONES_ALLOWED_COLS:
        if k not in data:
            continue

        v = data.get(k)

        if k == "descripcion":
            v = _trim(v) if v is not None else None

        if k in ("active", "id_tipo_notificacion", "id_modulo", "id_user", "urgente", "leido"):
            v = _to_int_or_none(v)

        if k in ("datetime", "fecha_notificacion"):
            v = _to_mysql_datetime(v)

        out[k] = v

    return out


# =============================
# Tabla: notificaciones
# Campos: id_notificacion, active, id_tipo_notificacion, datetime,
#         id_modulo, descripcion, id_user, urgente, fecha_notificacion, leido
# =============================
import json


def list_notificaciones() -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT
                    n.id_notificacion AS id,
                    n.active,
                    n.id_tipo_notificacion,
                    n.datetime,
                    n.id_modulo,
                    n.descripcion,
                    n.id_user,
                    n.urgente,
                    n.fecha_notificacion,
                    n.leido,
                    u.name AS nombre_usuario,
                    tn.nombre AS nombre_tipo_notificacion,
                    m.nombre AS nombre_modulo,

                    COALESCE((
                        SELECT JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'id_user', ul.id_user,
                                'nombre', ul.name
                            )
                        )
                        FROM notificaciones_leidos nl
                        INNER JOIN users ul
                            ON ul.id_user = nl.id_user
                        WHERE nl.id_notificacion = n.id_notificacion
                          AND nl.leido = 1
                    ), JSON_ARRAY()) AS usuarios_leyeron

                FROM notificaciones n
                LEFT JOIN users u
                    ON u.id_user = n.id_user
                LEFT JOIN modulos m
                    ON m.id_modulo = n.id_modulo
                LEFT JOIN tipo_notificaciones tn
                    ON tn.id_tipo_notificacion = n.id_tipo_notificacion
                ORDER BY n.fecha_notificacion DESC, n.id_notificacion DESC
                """
            )
            rows = cur.fetchall()

            for r in rows:
                r["code"] = r["id"]

                if isinstance(r.get("usuarios_leyeron"), str):
                    try:
                        r["usuarios_leyeron"] = json.loads(r["usuarios_leyeron"])
                    except Exception:
                        r["usuarios_leyeron"] = []
                elif r.get("usuarios_leyeron") is None:
                    r["usuarios_leyeron"] = []

            return rows
    finally:
        conn.close()

def create_notificacion(*, data: Dict[str, Any]) -> int:
    payload = _sanitize_payload(data)

    # Requeridos (según tu tabla en la captura: Nulo = No en todos)
    if payload.get("id_user") is None:
        raise ValueError("id_user es requerido")
    if payload.get("id_tipo_notificacion") is None:
        raise ValueError("id_tipo_notificacion es requerido")
    if payload.get("id_modulo") is None:
        raise ValueError("id_modulo es requerido")
    if payload.get("descripcion") in (None, ""):
        raise ValueError("descripcion es requerido")

    now = dt.now().strftime("%Y-%m-%d %H:%M:%S")

    # Defaults razonables si el cliente no manda (y tu tabla no permite NULL)
    if payload.get("active") is None:
        payload["active"] = 1
    if payload.get("urgente") is None:
        payload["urgente"] = 0
    if payload.get("leido") is None:
        payload["leido"] = 0
    if payload.get("datetime") is None:
        payload["datetime"] = now
    if payload.get("fecha_notificacion") is None:
        payload["fecha_notificacion"] = now

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cols: List[str] = []
            vals: List[str] = []
            params: List[Any] = []

            for k, v in payload.items():
                cols.append(k)
                vals.append("%s")
                params.append(v)

            sql = f"INSERT INTO notificaciones ({', '.join(cols)}) VALUES ({', '.join(vals)})"
            cur.execute(sql, tuple(params))
            conn.commit()
            return cur.lastrowid
    finally:
        conn.close()


def get_notificacion_by_id(*, id_notificacion: int, id_user: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:

            # =========================
            # 1. Verificar si ya existe registro de lectura
            # =========================
            cur.execute(
                """
                SELECT id_notificacion_leido
                FROM notificaciones_leidos
                WHERE id_user = %s AND id_notificacion = %s
                """,
                (id_user, id_notificacion),
            )

            existe = cur.fetchone()

            if not existe:
                cur.execute(
                    """
                    INSERT INTO notificaciones_leidos (
                        id_user,
                        leido,
                        id_notificacion,
                        fecha_leido
                    )
                    VALUES (%s, %s, %s, NOW())
                    """,
                    (
                        id_user,
                        1,
                        id_notificacion,
                    ),
                )
                conn.commit()

            # =========================
            # 2. SELECT principal
            # =========================
            cur.execute(
                """
                SELECT
                    n.id_notificacion AS id,
                    n.active,
                    n.id_tipo_notificacion,
                    n.datetime,
                    n.id_modulo,
                    n.descripcion,
                    n.id_user,
                    n.urgente,
                    n.clave,
                    n.fecha_notificacion,
                    n.leido,
                    u.name AS nombre_usuario,
                    tn.nombre AS nombre_tipo_notificacion,
                    m.nombre AS nombre_modulo,

                    COALESCE((
                        SELECT JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'id_user', ul.id_user,
                                'nombre', ul.name,
                   
                                    'fecha_leido', nl.fecha_leido

                            )
                        )
                        FROM notificaciones_leidos nl
                        INNER JOIN users ul
                            ON ul.id_user = nl.id_user
                        WHERE nl.id_notificacion = n.id_notificacion
                          AND nl.leido = 1
                    ), JSON_ARRAY()) AS usuarios_leyeron

                FROM notificaciones n
                LEFT JOIN users u
                    ON u.id_user = n.id_user
                LEFT JOIN modulos m
                    ON m.id_modulo = n.id_modulo
                LEFT JOIN tipo_notificaciones tn
                    ON tn.id_tipo_notificacion = n.id_tipo_notificacion
                WHERE n.id_notificacion = %s
                """,
                (id_notificacion,),
            )

            row = cur.fetchone()

            if not row:
                return None

            row["code"] = row["id"]

            if isinstance(row.get("usuarios_leyeron"), str):
                try:
                    row["usuarios_leyeron"] = json.loads(row["usuarios_leyeron"])
                except Exception:
                    row["usuarios_leyeron"] = []
            elif row.get("usuarios_leyeron") is None:
                row["usuarios_leyeron"] = []

            return row

    finally:
        conn.close()
def update_notificacion_by_id(*, id_notificacion: int, data: Dict[str, Any]) -> int:
    payload = _sanitize_payload(data)
    if not payload:
        return 0

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sets: List[str] = []
            params: List[Any] = []

            for k, v in payload.items():
                sets.append(f"{k}=%s")
                params.append(v)

            params.append(id_notificacion)

            sql = f"UPDATE notificaciones SET {', '.join(sets)} WHERE id_notificacion=%s"
            cur.execute(sql, tuple(params))
            conn.commit()
            return cur.rowcount
    finally:
        conn.close()


def soft_delete_notificacion_by_id(*, id_notificacion: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE notificaciones SET active=0 WHERE id_notificacion=%s",
                (id_notificacion,),
            )
            conn.commit()
            return cur.rowcount
    finally:
        conn.close()