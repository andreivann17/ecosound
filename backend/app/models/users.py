# app/models/users.py
from typing import Any, Dict, Optional, List
from datetime import datetime
import bcrypt
import secrets
import string

from ..db import get_connection, get_admin_connection


def _get_conn(use_admin: bool = False):
    return get_admin_connection() if use_admin else get_connection()

# ==========================
# ===== EXCEPCIONES ========
# ==========================

class EmailAlreadyExists(Exception):
    pass


# ==========================
# ====== HELPERS ===========
# ==========================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(10)).decode()


def verify_password(plain: str, hashed) -> bool:
    hashed_bytes = hashed if isinstance(hashed, bytes) else hashed.encode()
    return bcrypt.checkpw(plain.encode(), hashed_bytes)


# ==========================
# ===== USUARIOS ===========
# ==========================

def get_user_by_email(email: str, use_admin: bool = False) -> Optional[Dict[str, Any]]:
    conn = _get_conn(use_admin)
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute("SELECT * FROM users WHERE email=%s", (email,))
            return cur.fetchone()
    finally:
        conn.close()


def create_user(*, name: str, email: str, password_plain: str, id_user_creation: int) -> str:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM users WHERE email=%s", (email,))
            if cur.fetchone():
                raise EmailAlreadyExists("Email ya registrado")

            code = secrets.token_hex(6)
            hashed = hash_password(password_plain)

            cur.execute(
                """
                INSERT INTO users
                (code, name, email, password, id_user_creation, active, datetime)
                VALUES (%s,%s,%s,%s,%s,1,NOW())
                """,
                (code, name, email, hashed, id_user_creation),
            )
            conn.commit()
            return code
    finally:
        conn.close()


def get_user_id_cliente(id_user: int) -> Optional[int]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT email FROM users WHERE id_user = %s AND usuario_cliente = 1",
                (id_user,),
            )
            row = cur.fetchone()
            if not row:
                return None
            email = row[0]
            cur.execute(
                "SELECT id_cliente FROM users WHERE email = %s AND usuario_cliente = 1 ORDER BY id_user DESC LIMIT 1",
                (email,),
            )
            row = cur.fetchone()
        val = row[0] if row else None
        return int(val) if val else None
    finally:
        conn.close()


def get_user_tenant_info(id_user: int) -> Dict[str, int]:
    """Returns id_cliente for the given user (used to embed in JWT)."""
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id_cliente FROM users WHERE id_user=%s AND active=1",
                (id_user,),
            )
            row = cur.fetchone()
        val = (row or {}).get("id_cliente") or 0
        return {"id_cliente": int(val)}
    finally:
        conn.close()


def get_user_cliente_flag(id_user: int) -> Optional[int]:
    """Returns the usuario_cliente value (0 or 1) for the given user, or None if not found."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT usuario_cliente FROM users WHERE id_user=%s", (id_user,))
            row = cur.fetchone()
            return int(row[0]) if row else None
    finally:
        conn.close()


def get_user_id_by_code(code: str) -> Optional[int]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id_user FROM users WHERE code=%s", (code,))
            r = cur.fetchone()
            return r[0] if r else None
    finally:
        conn.close()


def get_user_by_code(code: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id_user, code, name, email, active, path, filename, datetime FROM users WHERE code=%s",
                (code,),
            )
            row = cur.fetchone()
            if row and hasattr(row.get("datetime"), "isoformat"):
                row["datetime"] = row["datetime"].isoformat()
            return row
    finally:
        conn.close()


def update_user_imagen(code: str, filename: str, path: str) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET filename = %s, path = %s WHERE code = %s",
                (filename, path, code),
            )
            affected = cur.rowcount
        conn.commit()
        return affected
    finally:
        conn.close()


def list_users(*, search: Optional[str] = None, id_cliente: Optional[int] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            sql = "SELECT id_user, code, name, email, active, datetime, path FROM users WHERE active=1"
            params: list = []
            if id_cliente is not None:
                sql += " AND id_cliente = %s"
                params.append(id_cliente)
            if search:
                sql += " AND (name LIKE %s OR email LIKE %s)"
                params.extend([f"%{search}%", f"%{search}%"])
            sql += " ORDER BY id_user DESC"
            cur.execute(sql, tuple(params))
            return cur.fetchall()
    finally:
        conn.close()


def get_user_by_id(id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id_user, code, name, email, active FROM users WHERE id_user=%s",
                (id,),
            )
            return cur.fetchone()
    finally:
        conn.close()

def update_user(*, id_user: int, data: Dict[str, Any]) -> int:
    allowed = {"name", "email", "password", "active"}
    sets, params = [], []

    for k, v in data.items():
        if k not in allowed:
            continue
        if k == "password":
            v = hash_password(v)
        sets.append(f"{k}=%s")
        params.append(v)

    if not sets:
        return 0

    params.append(id_user)
    sql = f"UPDATE users SET {', '.join(sets)} WHERE id_user=%s"

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, tuple(params))
            conn.commit()
            return cur.rowcount
    finally:
        conn.close()


def set_user_active_flag(*, id_user: int, active_value: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET active=%s WHERE id_user=%s",
                (active_value, id_user),
            )
            conn.commit()
            return cur.rowcount
    finally:
        conn.close()


# ==========================
# ===== PERMISOS ===========
# ==========================

_MODULES = ["eventos", "trabajadores", "inventario", "usuarios", "agenda", "estadisticas", "configuracion", "paquetes", "gastos", "notificaciones"]
_ACTIONS = ["modulo", "consultar", "insertar", "editar", "eliminar"]


def _get_modulo_map(conn) -> Dict[str, int]:
    with conn.cursor(dictionary=True) as cur:
        cur.execute("SELECT id_modulo, nombre FROM modulos WHERE active = 1")
        rows = cur.fetchall() or []
    return {r["nombre"].lower(): r["id_modulo"] for r in rows}


def get_user_permissions(id_user: int) -> Dict[str, Any]:
    conn = get_connection()
    try:
        modulo_map = _get_modulo_map(conn)
        id_to_nombre = {v: k for k, v in modulo_map.items()}

        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT id_modulo, modulo, consultar, insertar, editar, eliminar
                FROM usuarios_privilegios
                WHERE id_user = %s AND active = 1
                """,
                (id_user,),
            )
            rows = cur.fetchall() or []

        configured = {id_to_nombre[row["id_modulo"]] for row in rows if row["id_modulo"] in id_to_nombre}
        # Modules with no privilege row default all actions to True so new modules
        # are fully accessible without needing manual per-user DB setup.
        result = {
            m: {a: (m not in configured) for a in _ACTIONS}
            for m in _MODULES
        }
        for row in rows:
            nombre = id_to_nombre.get(row["id_modulo"])
            if nombre and nombre in result:
                result[nombre]["modulo"]    = bool(row["modulo"])
                result[nombre]["consultar"] = bool(row["consultar"])
                result[nombre]["insertar"]  = bool(row["insertar"])
                result[nombre]["editar"]    = bool(row["editar"])
                result[nombre]["eliminar"]  = bool(row["eliminar"])
        return result
    finally:
        conn.close()


def save_user_permissions(id_user: int, permisos: Dict[str, Any], id_user_created: int = 0) -> None:
    import datetime as _dt
    conn = get_connection()
    try:
        modulo_map = _get_modulo_map(conn)
        now = _dt.datetime.now()

        with conn.cursor() as cur:
            for module in _MODULES:
                id_modulo = modulo_map.get(module)
                if not id_modulo:
                    continue
                p = permisos.get(module, {})
                cur.execute(
                    """
                    INSERT INTO usuarios_privilegios
                        (id_user, id_modulo, modulo, consultar, insertar, editar, eliminar, active, datetime, id_user_created)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 1, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        modulo          = VALUES(modulo),
                        consultar       = VALUES(consultar),
                        insertar        = VALUES(insertar),
                        editar          = VALUES(editar),
                        eliminar        = VALUES(eliminar),
                        datetime        = VALUES(datetime),
                        id_user_created = VALUES(id_user_created)
                    """,
                    (
                        id_user, id_modulo,
                        int(bool(p.get("modulo",    False))),
                        int(bool(p.get("consultar", False))),
                        int(bool(p.get("insertar",  False))),
                        int(bool(p.get("editar",    False))),
                        int(bool(p.get("eliminar",  False))),
                        now,
                        id_user_created,
                    ),
                )
        conn.commit()
    finally:
        conn.close()


# ==========================
# ===== PERFIL EXTRA =======
# ==========================

_PERFIL_DDL = """
CREATE TABLE IF NOT EXISTS perfil (
    id_perfil        INT(11)      AUTO_INCREMENT PRIMARY KEY,
    nombre           VARCHAR(125) NOT NULL DEFAULT '',
    apellido         VARCHAR(125) NOT NULL DEFAULT '',
    fecha_nacimiento DATETIME     DEFAULT NULL,
    active           TINYINT(1)   NOT NULL DEFAULT 1,
    telefono         INT(20)      DEFAULT NULL,
    id_user          INT(11)      NOT NULL,
    datetime         DATETIME     NOT NULL,
    ultima_sesion    DATETIME     DEFAULT NULL,
    path             VARCHAR(125) DEFAULT NULL,
    filename         VARCHAR(125) DEFAULT NULL,
    UNIQUE KEY uq_perfil_user (id_user)
)
"""


def _ensure_perfil(conn):
    with conn.cursor() as cur:
        cur.execute(_PERFIL_DDL)
    conn.commit()


def _get_id_cliente_from_user(conn, id_user: int) -> Optional[int]:
    with conn.cursor() as cur:
        cur.execute("SELECT id_cliente FROM users WHERE id_user=%s LIMIT 1", (id_user,))
        row = cur.fetchone()
    return row[0] if row else None


def get_user_full_by_id(id_user: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id_user, code, name, email, active, path, filename, datetime, ultmo_inicio_sesion FROM users WHERE id_user=%s",
                (id_user,),
            )
            row = cur.fetchone()
            if row:
                for f in ("datetime", "ultmo_inicio_sesion"):
                    if row.get(f) and hasattr(row[f], "isoformat"):
                        row[f] = row[f].isoformat()
            return row
    finally:
        conn.close()


def get_user_perfil(id_user: int) -> Dict[str, Any]:
    conn = get_connection()
    try:
        _ensure_perfil(conn)
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT nombre, apellido, fecha_nacimiento, telefono, ultima_sesion, path, filename FROM perfil WHERE id_user=%s AND active=1",
                (id_user,),
            )
            row = cur.fetchone() or {}
        for field in ("fecha_nacimiento", "ultima_sesion"):
            if row.get(field) and hasattr(row[field], "isoformat"):
                row[field] = row[field].isoformat()
        return row
    finally:
        conn.close()


def upsert_user_perfil(id_user: int, data: Dict[str, Any]) -> None:
    allowed = {"nombre", "apellido", "fecha_nacimiento", "telefono"}
    filtered = {k: v for k, v in data.items() if k in allowed}
    if not filtered:
        return
    conn = get_connection()
    try:
        _ensure_perfil(conn)
        with conn.cursor(dictionary=True) as cur:
            cur.execute("SELECT id_perfil FROM perfil WHERE id_user=%s", (id_user,))
            exists = cur.fetchone()
        if exists:
            sets = ", ".join(f"{k}=%s" for k in filtered)
            params = list(filtered.values()) + [id_user]
            with conn.cursor() as cur:
                cur.execute(f"UPDATE perfil SET {sets} WHERE id_user=%s", params)
        else:
            id_cliente = _get_id_cliente_from_user(conn, id_user)
            cols = ", ".join(filtered.keys())
            vals = ", ".join(["%s"] * len(filtered))
            params = list(filtered.values()) + [id_user, id_cliente]
            with conn.cursor() as cur:
                cur.execute(
                    f"INSERT INTO perfil ({cols}, id_user, active, datetime, id_cliente) VALUES ({vals}, %s, 1, NOW(), %s)",
                    params,
                )
        conn.commit()
    finally:
        conn.close()


def update_perfil_imagen(id_user: int, filename: str, path: str) -> None:
    conn = get_connection()
    try:
        _ensure_perfil(conn)
        with conn.cursor(dictionary=True) as cur:
            cur.execute("SELECT id_perfil FROM perfil WHERE id_user=%s", (id_user,))
            exists = cur.fetchone()
        if exists:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE perfil SET filename=%s, path=%s WHERE id_user=%s",
                    (filename, path, id_user),
                )
        else:
            id_cliente = _get_id_cliente_from_user(conn, id_user)
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO perfil (id_user, nombre, apellido, active, datetime, filename, path, id_cliente) VALUES (%s, '', '', 1, NOW(), %s, %s, %s)",
                    (id_user, filename, path, id_cliente),
                )
        conn.commit()
    finally:
        conn.close()


def update_ultima_sesion(id_user: int) -> None:
    conn = get_connection()
    try:
        _ensure_perfil(conn)
        with conn.cursor(dictionary=True) as cur:
            cur.execute("SELECT id_perfil FROM perfil WHERE id_user=%s", (id_user,))
            exists = cur.fetchone()
        now = datetime.now()
        if exists:
            with conn.cursor() as cur:
                cur.execute("UPDATE perfil SET ultima_sesion=%s WHERE id_user=%s", (now, id_user))
        else:
            id_cliente = _get_id_cliente_from_user(conn, id_user)
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO perfil (id_user, nombre, apellido, active, datetime, ultima_sesion, id_cliente) VALUES (%s, '', '', 1, %s, %s, %s)",
                    (id_user, now, now, id_cliente),
                )
        with conn.cursor() as cur:
            cur.execute("UPDATE users SET ultmo_inicio_sesion=%s WHERE id_user=%s", (now, id_user))
        conn.commit()
    finally:
        conn.close()


def change_own_password(id_user: int, current_password: str, new_password: str) -> bool:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute("SELECT password FROM users WHERE id_user=%s", (id_user,))
            row = cur.fetchone()
        if not row:
            return False
        if not verify_password(current_password, row["password"]):
            return False
        hashed = hash_password(new_password)
        with conn.cursor() as cur:
            cur.execute("UPDATE users SET password=%s WHERE id_user=%s", (hashed, id_user))
        conn.commit()
        return True
    finally:
        conn.close()


def update_user_password(email: str, new_plain_password: str, use_admin: bool = False) -> bool:
    hashed = hash_password(new_plain_password)
    conn = _get_conn(use_admin)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET password=%s WHERE email=%s",
                (hashed, email),
            )
            conn.commit()
            return cur.rowcount > 0
    finally:
        conn.close()


# ==========================
# === RESET TOKENS =========
# ==========================

def save_reset_token(email: str, code: str, id_cliente: Optional[int] = None, use_admin: bool = False) -> None:
    conn = _get_conn(use_admin)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users_reset_tokens (email, code, id_cliente, created_at, used)
                VALUES (%s, %s, %s, NOW(), 0)
                """,
                (email, code, id_cliente),
            )
            conn.commit()
    finally:
        conn.close()


def validate_reset_code(email: str, code: str, use_admin: bool = False) -> bool:
    conn = _get_conn(use_admin)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1
                FROM users_reset_tokens
                WHERE email=%s
                  AND code=%s
                  AND used=0
                  AND created_at >= NOW() - INTERVAL 1 HOUR
                """,
                (email, code),
            )
            return cur.fetchone() is not None
    finally:
        conn.close()


def consume_reset_code(email: str, code: str, use_admin: bool = False) -> bool:
    conn = _get_conn(use_admin)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users_reset_tokens
                SET used=1
                WHERE email=%s
                  AND code=%s
                  AND used=0
                  AND created_at >= NOW() - INTERVAL 1 HOUR
                """,
                (email, code),
            )
            conn.commit()
            return cur.rowcount > 0
    finally:
        conn.close()
