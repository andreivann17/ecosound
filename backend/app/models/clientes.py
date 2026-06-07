from __future__ import annotations
from typing import Any, Dict, List, Optional
from ..db import get_admin_connection as get_connection, get_connection as get_ecosound_connection
import datetime as dt
import bcrypt
import secrets


# ================== HELPERS DE USUARIO (ecosound.users) ==================

def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(10)).decode()


def check_email_available_for_cliente(email: str) -> Optional[str]:
    """
    Bloquea solo si el correo ya tiene una fila activa en ecosound.users (active=1).
    Si existe con active=0 devuelve None — se reactivará en provision.
    """
    if not email:
        return None
    conn = get_ecosound_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT usuario_cliente FROM users WHERE email=%s AND active=1 LIMIT 1",
                (email.strip().lower(),),
            )
            row = cur.fetchone()
        if not row:
            return None
        if row["usuario_cliente"] == 1:
            return "Este correo ya tiene una cuenta activa. Inicia sesión o contacta a soporte."
        return "El correo ya pertenece a un usuario administrador del sistema. Usa otro correo para este cliente."
    finally:
        conn.close()


def _create_user_for_cliente(id_cliente: int, data: Dict[str, Any], id_user: int) -> None:
    email = (data.get("correo") or "").strip()
    if not email:
        return
    name = f"{data.get('nombre_cliente', '')} {data.get('apellido_cliente', '')}".strip()
    hashed = _hash_password(data.get("password_plain") or "123456")
    code = secrets.token_hex(6)
    active = 1 if data.get("habilitar_sistema") else 0
    creator = id_user if id_user else None  # evitar FK violation con id=0

    # 1) ecosound.users + privilegios
    conn = get_ecosound_connection()
    try:
        with conn.cursor() as cur:
            # Obtener todos los módulos activos del sistema
            cur.execute("SELECT id_modulo FROM modulos WHERE active = 1")
            modulo_ids = [r[0] for r in cur.fetchall()] or list(range(1, 11))

            cur.execute(
                """
                INSERT INTO users
                    (code, name, email, password, id_user_creation, active,
                     datetime, id_cliente, usuario_cliente)
                VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s, 1)
                """,
                (code, name, email, hashed, creator, active, id_cliente),
            )
            new_user_id = cur.lastrowid
            now = dt.datetime.now()
            for id_modulo in modulo_ids:
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
                    (new_user_id, id_modulo, now, creator, now),
                )
        conn.commit()
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

def get_trial_status(id_app: int, id_cliente: int) -> Dict[str, Any]:
    """Devuelve habilitar_sistema y fecha_fin_prueba para verificar en el login."""
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT habilitar_sistema, fecha_fin_prueba
                FROM apps_clientes
                WHERE id_cliente = %s AND id_app = %s AND active = 1
                LIMIT 1
                """,
                (int(id_cliente), id_app),
            )
            row = cur.fetchone() or {}
        if row.get("fecha_fin_prueba") and hasattr(row["fecha_fin_prueba"], "isoformat"):
            row["fecha_fin_prueba"] = row["fecha_fin_prueba"].isoformat()
        return row
    finally:
        conn.close()


def list_clientes(id_app: int, search: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            base = """
                SELECT c.*, ac.id_app_cliente, ac.habilitar_sistema,
                       ac.fecha_proxima_pago, ac.fecha_fin_prueba, ac.tipo_subscripcion
                FROM clientes c
                LEFT JOIN apps_clientes ac ON ac.id_cliente = c.id_cliente
                    AND ac.id_app = %s AND ac.active = 1
                WHERE c.active = 1
            """
            params: list = [id_app]

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
            for k in ("datetime", "fecha_proxima_pago", "fecha_fin_prueba"):
                if hasattr(row.get(k), "isoformat"):
                    row[k] = row[k].isoformat()
        return rows
    finally:
        conn.close()


def get_cliente_by_id(id_app: int, id_cliente: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT c.*, ac.id_app_cliente, ac.habilitar_sistema,
                       ac.fecha_proxima_pago, ac.fecha_fin_prueba, ac.tipo_subscripcion
                FROM clientes c
                LEFT JOIN apps_clientes ac ON ac.id_cliente = c.id_cliente
                    AND ac.id_app = %s AND ac.active = 1
                WHERE c.id_cliente = %s AND c.active = 1
                LIMIT 1
                """,
                (id_app, int(id_cliente)),
            )
            row = cur.fetchone()
            if row:
                for k in ("datetime", "fecha_proxima_pago", "fecha_fin_prueba"):
                    if hasattr(row.get(k), "isoformat"):
                        row[k] = row[k].isoformat()
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


def _seed_defaults_for_cliente(id_cliente: int) -> None:
    conn = get_ecosound_connection()
    try:
        with conn.cursor() as cur:
            for nombre, color in [
                ("San Luis Rio Colorado", "#1677FF"),
                ("Mexicali",              "#52C41A"),
                ("Puerto Peñasco",        "#FA8C16"),
                ("Tijuana",               "#722ED1"),
            ]:
                cur.execute(
                    "INSERT INTO ciudades (nombre, color_hex, active, id_cliente) VALUES (%s, %s, 1, %s)",
                    (nombre, color, id_cliente),
                )
            for nombre in ["Bodas", "XV", "Cumpleaños", "Corporativo", "Graduaciones", "Otro"]:
                cur.execute(
                    "INSERT INTO tipo_eventos (nombre, active, id_cliente) VALUES (%s, 1, %s)",
                    (nombre, id_cliente),
                )
            cur.execute(
                "INSERT INTO tipo_gastos (nombre, active, id_cliente) VALUES (%s, 1, %s)",
                ("Otro", id_cliente),
            )
            for nombre in ["Bodas", "XV", "Cumpleaños", "Corporativo", "Graduaciones", "Citas", "Reunion Zoom", "Otro"]:
                cur.execute(
                    "INSERT INTO agenda_evento (nombre, active, id_cliente) VALUES (%s, 1, %s)",
                    (nombre, id_cliente),
                )
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()


def create_cliente(id_app: int, data: Dict[str, Any], id_user: int) -> Dict[str, Any]:
    now = dt.datetime.now()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO clientes
                    (nombre_cliente, apellido_cliente, rfc, correo, celular,
                     nombre_empresa, active, id_user, datetime,
                     stripe_customer_id, stripe_subscription_id, stripe_price_id,
                     stripe_payment_method_id, suscripcion_estado,
                     trial_end, current_period_start, current_period_end,
                     fecha_terminos_aceptados, terminos_ip, terminos_version,
                     acepta_marketing)
                VALUES (%s, %s, %s, %s, %s, %s, 1, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    data.get("nombre_cliente", ""),
                    data.get("apellido_cliente", ""),
                    data.get("rfc") or None,
                    data.get("correo") or None,
                    data.get("celular") or None,
                    data.get("nombre_empresa") or None,
                    id_user,
                    now,
                    data.get("stripe_customer_id") or None,
                    data.get("stripe_subscription_id") or None,
                    data.get("stripe_price_id") or None,
                    data.get("stripe_payment_method_id") or None,
                    data.get("suscripcion_estado") or None,
                    data.get("trial_end") or None,
                    data.get("current_period_start") or None,
                    data.get("current_period_end") or None,
                    data.get("fecha_terminos_aceptados") or None,
                    data.get("terminos_ip") or None,
                    data.get("terminos_version") or None,
                    int(bool(data.get("acepta_marketing"))),
                ),
            )
            new_id = cur.lastrowid
            cur.execute(
                """
                INSERT INTO apps_clientes
                    (id_app, id_cliente, active, datetime, id_user,
                     fecha_proxima_pago, habilitar_sistema, fecha_fin_prueba, tipo_subscripcion)
                VALUES (%s, %s, 1, %s, %s, %s, %s, %s, %s)
                """,
                (
                    id_app,
                    new_id,
                    now,
                    id_user,
                    data.get("fecha_proxima_pago") or None,
                    int(bool(data.get("habilitar_sistema", False))),
                    data.get("fecha_fin_prueba") or None,
                    data.get("tipo_subscripcion") or "mensual",
                ),
            )

        conn.commit()
        _seed_defaults_for_cliente(new_id)
        _create_user_for_cliente(new_id, data, id_user)
        return {"id_cliente": new_id}
    finally:
        conn.close()


def reactivate_cliente(id_app: int, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Reactiva una cuenta inactiva: obtiene id_cliente desde ecosound.users,
    actualiza password y activa el usuario, luego reactiva las filas en
    administrador.clientes y apps_clientes con los nuevos datos de Stripe.
    """
    email_clean = (data.get("correo") or "").strip().lower()
    now = dt.datetime.now()

    # 1) Obtener id_cliente desde ecosound.users (fuente de verdad)
    conn_eco = get_ecosound_connection()
    try:
        with conn_eco.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id_cliente FROM users WHERE email=%s AND usuario_cliente=1 LIMIT 1",
                (email_clean,),
            )
            row = cur.fetchone()
        if not row:
            raise ValueError(f"No se encontró usuario con correo {email_clean} para reactivar.")
        id_cliente = row["id_cliente"]

        # 2) Reactivar user y actualizar password + nombre
        hashed = _hash_password(data.get("password_plain") or "")
        nombre_completo = f"{data.get('nombre_cliente', '')} {data.get('apellido_cliente', '')}".strip()
        with conn_eco.cursor() as cur:
            cur.execute(
                "UPDATE users SET active=1, password=%s, name=%s WHERE email=%s AND usuario_cliente=1",
                (hashed, nombre_completo, email_clean),
            )
        conn_eco.commit()
    finally:
        conn_eco.close()

    # 3) Reactivar clientes + apps_clientes en administrador con nuevos datos de Stripe
    conn_adm = get_connection()
    try:
        with conn_adm.cursor() as cur:
            cur.execute(
                """
                UPDATE clientes SET
                    active=1, nombre_cliente=%s, apellido_cliente=%s, nombre_empresa=%s,
                    stripe_customer_id=%s, stripe_subscription_id=%s, stripe_price_id=%s,
                    stripe_payment_method_id=%s, suscripcion_estado=%s, trial_end=%s,
                    current_period_start=%s, current_period_end=%s,
                    fecha_terminos_aceptados=%s, terminos_ip=%s, terminos_version=%s,
                    acepta_marketing=%s
                WHERE id_cliente=%s
                """,
                (
                    data.get("nombre_cliente", ""),
                    data.get("apellido_cliente", ""),
                    data.get("nombre_empresa") or None,
                    data.get("stripe_customer_id") or None,
                    data.get("stripe_subscription_id") or None,
                    data.get("stripe_price_id") or None,
                    data.get("stripe_payment_method_id") or None,
                    data.get("suscripcion_estado") or "active",
                    data.get("trial_end") or None,
                    data.get("current_period_start") or None,
                    data.get("current_period_end") or None,
                    data.get("fecha_terminos_aceptados") or None,
                    data.get("terminos_ip") or None,
                    data.get("terminos_version") or None,
                    int(bool(data.get("acepta_marketing"))),
                    id_cliente,
                ),
            )
            cur.execute(
                """
                INSERT INTO apps_clientes
                    (id_app, id_cliente, active, datetime, id_user,
                     fecha_proxima_pago, habilitar_sistema, fecha_fin_prueba, tipo_subscripcion)
                VALUES (%s, %s, 1, %s, NULL, %s, 1, %s, %s)
                ON DUPLICATE KEY UPDATE
                    active=1, habilitar_sistema=1,
                    fecha_proxima_pago=%s, fecha_fin_prueba=%s, tipo_subscripcion=%s
                """,
                (
                    id_app, id_cliente, now,
                    data.get("fecha_proxima_pago") or None,
                    data.get("fecha_fin_prueba") or None,
                    data.get("tipo_subscripcion") or "mensual",
                    data.get("fecha_proxima_pago") or None,
                    data.get("fecha_fin_prueba") or None,
                    data.get("tipo_subscripcion") or "mensual",
                ),
            )
        conn_adm.commit()
    finally:
        conn_adm.close()

    return {"id_cliente": id_cliente}


def update_cliente(id_app: int, id_cliente: int, data: Dict[str, Any]) -> int:
    client_fields = {"nombre_cliente", "apellido_cliente", "rfc", "correo", "celular"}
    app_fields = {"fecha_proxima_pago", "habilitar_sistema", "fecha_fin_prueba", "tipo_subscripcion"}
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
                    f"UPDATE apps_clientes SET {sc} WHERE id_app = %s AND id_cliente = %s",
                    list(app_up.values()) + [id_app, int(id_cliente)],
                )
        conn.commit()
        _update_user_for_cliente(id_cliente, data)
        return 1
    finally:
        conn.close()


def delete_cliente(id_app: int, id_cliente: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE clientes SET active = 0 WHERE id_cliente = %s", (int(id_cliente),))
            cur.execute(
                "UPDATE apps_clientes SET active = 0 WHERE id_cliente = %s AND id_app = %s",
                (int(id_cliente), id_app),
            )
        conn.commit()
        _deactivate_user_for_cliente(id_cliente)
        return 1
    finally:
        conn.close()


# ================== PAGOS ==================

def list_pagos(id_app: int, id_cliente: int) -> List[Dict[str, Any]]:
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
                (int(id_cliente), id_app),
            )
            rows = cur.fetchall() or []
        for row in rows:
            for k in ("datetime", "fecha_pago"):
                if hasattr(row.get(k), "isoformat"):
                    row[k] = row[k].isoformat()
        return rows
    finally:
        conn.close()


def create_pago(id_app: int, id_cliente: int, data: Dict[str, Any], id_user: int) -> Dict[str, Any]:
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
                    id_app,
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


# ================== ARCHIVOS (metadata BD) ==================

def save_archivo_db(
    id_cliente: int, id_app: int, tipo: str,
    nombre_original: str, nombre_almacenado: str,
    size_bytes: int, id_user: int,
) -> None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO clientes_archivos
                    (id_cliente, id_app, tipo, nombre_original, nombre_almacenado, size_bytes, id_user, datetime, active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), 1)
                """,
                (id_cliente, id_app, tipo, nombre_original, nombre_almacenado, size_bytes, id_user),
            )
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()


def delete_archivo_db(id_cliente: int, tipo: str, nombre_almacenado: str) -> None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE clientes_archivos SET active=0 WHERE id_cliente=%s AND tipo=%s AND nombre_almacenado=%s",
                (id_cliente, tipo, nombre_almacenado),
            )
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()
