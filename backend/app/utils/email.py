"""Shared email utility — sends HTML emails via Gmail SMTP in a background thread."""
from __future__ import annotations

import smtplib
import threading
from email.message import EmailMessage
from typing import List

SMTP_USER = "soporte.herrsoft@gmail.com"
SMTP_PASS = "rthy fkql nlep hnai"
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


def _do_send(to_emails: List[str], subject: str, html: str) -> None:
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            for email in to_emails:
                msg = EmailMessage()
                msg["From"] = f'"HerrSoft Events" <{SMTP_USER}>'
                msg["To"] = email
                msg["Subject"] = subject
                msg.set_content("Este correo requiere un cliente compatible con HTML.")
                msg.add_alternative(html, subtype="html")
                server.send_message(msg)
    except Exception:
        pass


def send_email_bg(to_emails: List[str], subject: str, html: str) -> None:
    """Dispatch email sending in a background thread so the request isn't blocked."""
    if not to_emails:
        return
    threading.Thread(target=_do_send, args=(to_emails, subject, html), daemon=True).start()


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
