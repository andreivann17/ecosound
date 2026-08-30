"""Shared email utility — sends HTML emails via Gmail SMTP in a background thread."""
from __future__ import annotations

import smtplib
import sys
import threading
from email.message import EmailMessage
from typing import List

SMTP_USER = "soporte.herrsoft@gmail.com"
SMTP_PASS = "cdpc nhne pxrz cfto"
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


def _log(msg: str) -> None:
    """Imprime de forma segura aunque la consola no soporte emojis/Unicode (p. ej. cp1252 en Windows)."""
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        encoding = getattr(sys.stdout, "encoding", None) or "ascii"
        print(msg.encode(encoding, errors="replace").decode(encoding), flush=True)


def _do_send(to_emails: List[str], subject: str, html: str, from_name: str = "HerrSoft Events") -> None:
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            for email in to_emails:
                try:
                    msg = EmailMessage()
                    msg["From"] = f'"{from_name}" <{SMTP_USER}>'
                    msg["To"] = email
                    msg["Subject"] = subject
                    msg.set_content("Este correo requiere un cliente compatible con HTML.")
                    msg.add_alternative(html, subtype="html")
                    server.send_message(msg)
                    _log(f"[email] Enviado a {email} — {subject}")
                except Exception as e:
                    _log(f"[email] ERROR al enviar correo a {email}: {e}")
    except Exception as e:
        _log(f"[email] ERROR de conexión SMTP ({to_emails}): {e}")


def send_email_bg(to_emails: List[str], subject: str, html: str, from_name: str = "HerrSoft Events") -> None:
    """Dispatch email sending in a background thread so the request isn't blocked."""
    if not to_emails:
        return
    threading.Thread(target=_do_send, args=(to_emails, subject, html, from_name), daemon=True).start()


def get_users_contact_info(id_users: List[int]) -> List[dict]:
    """Return {name, email} for the given users.id_user values (spie DB — evaluation module)."""
    if not id_users:
        return []
    from ..db import get_spie_connection
    conn = get_spie_connection()
    try:
        placeholders = ", ".join(["%s"] * len(id_users))
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                f"""
                SELECT name, email
                FROM users
                WHERE id_user IN ({placeholders}) AND active = 1
                """,
                tuple(id_users),
            )
            return cur.fetchall()
    except Exception:
        return []
    finally:
        conn.close()


def get_destinatarios_emails(id_modulo: int, source_id: int) -> List[str]:
    """Return the email addresses of users configured to receive this notification."""
    from ..db import get_connection
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT u.email
                FROM configuracion_correos cc
                JOIN users u ON u.id_user = cc.id_user_envio
                WHERE cc.id_modulo = %s AND cc.source_id = %s AND cc.active = 1
                  AND u.active = 1
                """,
                (id_modulo, source_id),
            )
            return [r["email"] for r in cur.fetchall()]
    except Exception:
        return []
    finally:
        conn.close()
