from __future__ import annotations
from typing import Any, Dict, List, Optional
from ..db import get_admin_connection as get_connection, get_connection as get_ecosound_connection
import datetime as dt
import bcrypt
import secrets

ID_APP_EVENTS = 1


# ================== HELPERS DE USUARIO (ecosound.users) ==================

def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(10)).decode()


def check_email_available_for_cliente(email: str) -> Optional[str]:
    """Returns an error message if the email is already taken in ecosound.users, else None."""
    if not email:
        return None
    conn = get_ecosound_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT usuario_cliente FROM users WHERE email=%s AND active=1",
                (email.strip(),),
            )
            row = cur.fetchone()
        if not row:
            return None
        if row["usuario_cliente"] == 1:
            return "El correo ya está asociado a otro cliente en el sistema."
        return "El correo ya pertenece a un usuario administrador del sistema. Usa otro correo para este cliente."
    finally:
        conn.close()


def _create_user_for_cliente(id_cliente: int, data: Dict[str, Any], id_user: int) -> None:
    email = (data.get("correo") or "").strip()
    if not email:
        return
    name = f"{data.get('nombre_cliente', '')} {data.get('apellido_cliente', '')}".strip()
    hashed = _hash_password("123456")
    code = secrets.token_hex(6)
    active = 1 if data.get("habilitar_sistema") else 0
    conn = get_ecosound_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users
                    (code, name, email, password, id_user_creation, active,
                     datetime, id_cliente, usuario_cliente)
                VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s, 1)
                """,
                (code, name, email, hashed, id_user, active, id_cliente),
            )
            new_user_id = cur.lastrowid

            # 8 privilege rows — all modules fully enabled
            now = dt.datetime.now()
            for id_modulo in range(1, 9):
                cur.execute(
                    """
                    INSERT INTO usuarios_privilegios
                        (id_user, id_modulo, modulo, insertar, consultar, editar,
                         eliminar, active, datetime, id_user_created)
                    VALUES (%s, %s, 1, 1, 1, 1, 1, 1, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        modulo=1, insertar=1, consultar=1, editar=1,
                        eliminar=1, active=1, datetime=%s
                    """,
                    (new_user_id, id_modulo, now, id_user, now),
                )
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()


def _update_user_for_cliente(id_cliente: int, data: Dict[str, Any]) -> None:
    sets, params = [], []
    if "nombre_cliente" in data or "apellido_cliente" in data:
        sets.append("name = %s")
        params.append(
            f"{data.get('nombre_cliente', '')} {data.get('apellido_cliente', '')}".strip()
        )
    if "correo" in data:
        sets.append("email = %s")
        params.append(data["correo"])
    if "habilitar_sistema" in data:
        sets.append("active = %s")
        params.append(1 if data["habilitar_sistema"] else 0)
    if not sets:
        return
    params.append(id_cliente)
    conn = get_ecosound_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE users SET {', '.join(sets)} WHERE id_cliente=%s AND usuario_cliente=1",
                params,
            )
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()


def _deactivate_user_for_cliente(id_cliente: int) -> None:
    conn = get_ecosound_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET active=0 WHERE id_cliente=%s AND usuario_cliente=1",
                (int(id_cliente),),
            )
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()


# ================== CLIENTES ==================

def list_clientes(search: Optional[str] = None, id_cliente: Optional[int] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            base = """
                SELECT c.*, ac.id_app_cliente, ac.habilitar_sistema, ac.fecha_proxima_pago
                FROM clientes c
                LEFT JOIN apps_clientes ac ON ac.id_cliente = c.id_cliente
                    AND ac.id_app = %s AND ac.active = 1
                WHERE c.active = 1
            """
            params: list = [ID_APP_EVENTS]

           

            if search:
                like = f"%{search}%"
                base += """
                    AND (c.nombre_cliente LIKE %s OR c.apellido_cliente LIKE %s
                         OR c.correo LIKE %s OR c.rfc LIKE %s)
                """
                params.extend([like, like, like, like])

            base += " ORDER BY c.nombre_cliente ASC"
            cur.execute(base, params)
            rows = cur.fetchall() or []
        for row in rows:
            for k in ("datetime", "fecha_proxima_pago"):
                if hasattr(row.get(k), "isoformat"):
                    row[k] = row[k].isoformat()
        return rows
    finally:
        conn.close()


def get_cliente_by_id(id_cliente: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT c.*, ac.id_app_cliente, ac.habilitar_sistema, ac.fecha_proxima_pago
                FROM clientes c
                LEFT JOIN apps_clientes ac ON ac.id_cliente = c.id_cliente
                    AND ac.id_app = %s AND ac.active = 1
                WHERE c.id_cliente = %s AND c.active = 1
                LIMIT 1
                """,
                (ID_APP_EVENTS, int(id_cliente)),
            )
            row = cur.fetchone()
            if row:
                for k in ("datetime", "fecha_proxima_pago"):
                    if hasattr(row.get(k), "isoformat"):
                        row[k] = row[k].isoformat()
                # All apps this client is subscribed to
                cur.execute(
                    """
                    SELECT a.id_app, a.nombre
                    FROM apps_clientes ac
                    JOIN apps a ON a.id_app = ac.id_app
                    WHERE ac.id_cliente = %s AND ac.active = 1
                    ORDER BY a.id_app
                    """,
                    (int(id_cliente),),
                )
                row["apps_contratadas"] = cur.fetchall() or []
        return row
    finally:
        conn.close()


_DEFAULT_CIUDADES = [
    ("San Luis Rio Colorado", "#1677FF"),
    ("Mexicali",              "#52C41A"),
    ("Puerto Peñasco",        "#FA8C16"),
    ("Tijuana",               "#722ED1"),
]

_DEFAULT_TIPO_EVENTOS = [
    "Bodas", "XV", "Cumpleaños", "Corporativo", "Graduaciones", "Otro",
]

_DEFAULT_TIPO_GASTOS = [
    "Otro",
]

_DEFAULT_AGENDA_EVENTO = [
    "Bodas", "XV", "Cumpleaños", "Corporativo", "Graduaciones",
    "Citas", "Reunion Zoom", "Otro",
]


def _seed_defaults_for_cliente(conn, id_cliente: int) -> None:
    cur = conn.cursor()
    try:
        for nombre, color in _DEFAULT_CIUDADES:
            print(nombre)
            print(color)
            cur.execute(
                "INSERT INTO ciudades (nombre, color_hex, active, id_cliente) VALUES (%s, %s, 1, %s)",
                (nombre, color, id_cliente),
            )

        for nombre in _DEFAULT_TIPO_EVENTOS:
            cur.execute(
                "INSERT INTO tipo_eventos (nombre, active, id_cliente) VALUES (%s, 1, %s)",
                (nombre, id_cliente),
            )

        for nombre in _DEFAULT_TIPO_GASTOS:
            cur.execute(
                "INSERT INTO tipo_gastos (nombre, active, id_cliente) VALUES (%s, 1, %s)",
                (nombre, id_cliente),
            )

        for nombre in _DEFAULT_AGENDA_EVENTO:
            cur.execute(
                "INSERT INTO agenda_evento (nombre, active, id_cliente) VALUES (%s, 1, %s)",
                (nombre, id_cliente),
            )
    finally:
        cur.close()


def create_cliente(data: Dict[str, Any], id_user: int) -> Dict[str, Any]:
    print("pasas1")
    now = dt.datetime.now()
    conn = get_connection()
    print("pasas2")
    try:
        print("pasas3")
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO clientes
                    (nombre_cliente, apellido_cliente, rfc, correo, celular, active, id_user, datetime)
                VALUES (%s, %s, %s, %s, %s, 1, %s, %s)
                """,
                (
                    data.get("nombre_cliente", ""),
                    data.get("apellido_cliente", ""),
                    data.get("rfc") or None,
                    data.get("correo") or None,
                    data.get("celular") or None,
                    id_user,
                    now,
                ),
            )
            new_id = cur.lastrowid
            cur.execute(
                """
                INSERT INTO apps_clientes
                    (id_app, id_cliente, active, datetime, id_user, fecha_proxima_pago, habilitar_sistema)
                VALUES (%s, %s, 1, %s, %s, %s, %s)
                """,
                (
                    ID_APP_EVENTS,
                    new_id,
                    now,
                    id_user,
                    data.get("fecha_proxima_pago") or None,
                    int(bool(data.get("habilitar_sistema", False))),
                ),
            )
        print("pasas")
        _seed_defaults_for_cliente(conn, new_id)
        conn.commit()
        _create_user_for_cliente(new_id, data, id_user)
        return {"id_cliente": new_id}
    finally:
        conn.close()


def update_cliente(id_cliente: int, data: Dict[str, Any]) -> int:
    client_fields = {"nombre_cliente", "apellido_cliente", "rfc", "correo", "celular"}
    app_fields = {"fecha_proxima_pago", "habilitar_sistema"}
    client_up = {k: v for k, v in data.items() if k in client_fields}
    app_up = {k: v for k, v in data.items() if k in app_fields}
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            if client_up:
                sc = ", ".join(f"{k} = %s" for k in client_up)
                cur.execute(
                    f"UPDATE clientes SET {sc} WHERE id_cliente = %s AND active = 1",
                    list(client_up.values()) + [int(id_cliente)],
                )
            if app_up:
                sc = ", ".join(f"{k} = %s" for k in app_up)
                cur.execute(
                    f"UPDATE apps_clientes SET {sc} WHERE id_app = %s AND id_cliente = %s AND active = 1",
                    list(app_up.values()) + [ID_APP_EVENTS, int(id_cliente)],
                )
        conn.commit()
        _update_user_for_cliente(id_cliente, data)
        return 1
    finally:
        conn.close()


def delete_cliente(id_cliente: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE clientes SET active = 0 WHERE id_cliente = %s", (int(id_cliente),))
            cur.execute(
                "UPDATE apps_clientes SET active = 0 WHERE id_cliente = %s AND id_app = %s",
                (int(id_cliente), ID_APP_EVENTS),
            )
        conn.commit()
        _deactivate_user_for_cliente(id_cliente)
        return 1
    finally:
        conn.close()


# ================== PAGOS ==================

def list_pagos(id_cliente: int) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT cp.*
                FROM clientes_pagos cp
                WHERE cp.id_cliente = %s AND cp.id_app = %s
                ORDER BY cp.fecha_pago DESC, cp.datetime DESC
                """,
                (int(id_cliente), ID_APP_EVENTS),
            )
            rows = cur.fetchall() or []
        for row in rows:
            for k in ("datetime", "fecha_pago"):
                if hasattr(row.get(k), "isoformat"):
                    row[k] = row[k].isoformat()
        return rows
    finally:
        conn.close()


def create_pago(id_cliente: int, data: Dict[str, Any], id_user: int) -> Dict[str, Any]:
    now = dt.datetime.now()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO clientes_pagos (id_cliente, monto, datetime, fecha_pago, id_app, id_user)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    int(id_cliente),
                    str(data.get("monto", "0")),
                    now,
                    data.get("fecha_pago") or now.date().isoformat(),
                    ID_APP_EVENTS,
                    id_user,
                ),
            )
            new_id = cur.lastrowid
        conn.commit()
        return {"id_cliente_pago": new_id}
    finally:
        conn.close()


def delete_pago(id_cliente_pago: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM clientes_pagos WHERE id_cliente_pago = %s",
                (int(id_cliente_pago),),
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()
