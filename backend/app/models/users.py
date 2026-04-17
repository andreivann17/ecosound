# app/models/users.py
from typing import Any, Dict, Optional, List
from datetime import datetime
import bcrypt
import secrets
import string

from ..db import get_connection

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


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ==========================
# ===== USUARIOS ===========
# ==========================

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
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
                "SELECT id_user, code, name, email, active FROM users WHERE code=%s",
                (code,),
            )
            return cur.fetchone()
    finally:
        conn.close()
def list_users(*, search: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            sql = "SELECT id_user, code, name, email, active, datetime FROM users WHERE active=1"
            params: list = []
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


def update_user_password(email: str, new_plain_password: str) -> bool:
    hashed = hash_password(new_plain_password)
    conn = get_connection()
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

def save_reset_token(email: str, code: str) -> None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users_reset_tokens (email, code, created_at, used)
                VALUES (%s, %s, NOW(), 0)
                """,
                (email, code),
            )
            conn.commit()
    finally:
        conn.close()


def validate_reset_code(email: str, code: str) -> bool:
    conn = get_connection()
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


def consume_reset_code(email: str, code: str) -> bool:
    conn = get_connection()
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
