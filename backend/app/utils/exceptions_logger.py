"""Logs exceptions to admin.excepciones and sends an alert email."""
from __future__ import annotations

import threading
import traceback
from datetime import datetime

ADMIN_EMAIL = "andreivann17@gmail.com"


def log_exception(descripcion: str, id_modulo: int = 0, is_backend: bool = True) -> None:
    """Fire-and-forget: saves to DB and sends email in a background thread."""
    threading.Thread(
        target=_do_log,
        args=(descripcion, id_modulo, is_backend),
        daemon=True,
    ).start()


def _do_log(descripcion: str, id_modulo: int, is_backend: bool) -> None:
    _save_to_db(descripcion, id_modulo, is_backend)
    _send_email(descripcion, id_modulo, is_backend)


def _save_to_db(descripcion: str, id_modulo: int, is_backend: bool) -> None:
    try:
        from ..db import get_admin_connection
        conn = get_admin_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO excepciones (descripcion, active, datetime, id_modulo, is_backend)
                    VALUES (%s, 1, %s, %s, %s)
                    """,
                    (descripcion[:65000], datetime.now(), id_modulo, 1 if is_backend else 0),
                )
            conn.commit()
        finally:
            conn.close()
    except Exception:
        pass


def _send_email(descripcion: str, id_modulo: int, is_backend: bool) -> None:
    try:
        from .email import send_email_bg
        source = "Backend" if is_backend else "Frontend"
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
            <h2 style="color: #dc3545; border-bottom: 2px solid #dc3545; padding-bottom: 8px;">
                &#9888; Excepci&oacute;n detectada &mdash; HerrSoft Events {source}
            </h2>
            <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
                <tr style="background:#f8f9fa;">
                    <td style="padding:8px 12px; font-weight:bold; width:140px;">Tipo</td>
                    <td style="padding:8px 12px;">{source}</td>
                </tr>
                <tr>
                    <td style="padding:8px 12px; font-weight:bold;">M&oacute;dulo ID</td>
                    <td style="padding:8px 12px;">{id_modulo}</td>
                </tr>
                <tr style="background:#f8f9fa;">
                    <td style="padding:8px 12px; font-weight:bold;">Fecha/Hora</td>
                    <td style="padding:8px 12px;">{now}</td>
                </tr>
            </table>
            <h3 style="margin-bottom:6px;">Descripci&oacute;n / Traceback:</h3>
            <pre style="background:#fff3cd; padding:16px; border-left:4px solid #dc3545;
                        overflow-x:auto; white-space:pre-wrap; font-size:13px;
                        border-radius:4px;">{descripcion[:10000]}</pre>
        </div>
        """
        send_email_bg([ADMIN_EMAIL], f"[HerrSoft Events] Excepción en {source}", html)
    except Exception:
        pass
