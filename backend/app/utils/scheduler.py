"""Background scheduler — checks events and sends reminder emails.

Logic: every minute, find events where:
  - The reminder deadline has already passed  (event_time - INTERVAL <= NOW)
  - The event hasn't started yet              (event_time > NOW)
  - The reminder hasn't been sent before      (not in recordatorios_correo_enviados)

This approach is resilient to server restarts: missed reminders are sent as soon
as the server comes back up, as long as the event hasn't started.
"""
from __future__ import annotations

import datetime as dt
import threading
import time
from typing import List, Dict, Any

_INTERVAL_SECONDS = 60   # check every 1 minute

EVENTO_MODULO_CORREO = 1  # id in user's modulos table

# (source_id, config_key, time_field, mysql_interval, label, icon)
_REMINDERS = [
    (2, "correo_hora_evento",  "hora_inicio",         "1 HOUR", "1 hora antes del evento",              "🕐"),
    (3, "correo_dia_evento",   "hora_inicio",         "1 DAY",  "1 día antes del evento",               "📅"),
    (7, "correo_hora_sesion",  "datetime_fotografia", "1 HOUR", "1 hora antes de la sesión de fotos",   "📷"),
    (8, "correo_dia_sesion",   "datetime_fotografia", "1 DAY",  "1 día antes de la sesión de fotos",    "📷"),
    (6, "correo_hora_misa",    "fecha_misa",          "1 HOUR", "1 hora antes de la misa",              "⛪"),
]


# ── HTML template ─────────────────────────────────────────────────────────────

def _evento_html(evento: Dict[str, Any], subject_label: str, icon: str, banner_text: str) -> str:
    def fmt(v):
        if v is None:
            return "—"
        if hasattr(v, "strftime"):
            return v.strftime("%d/%m/%Y %H:%M")
        return str(v)

    cliente     = evento.get("cliente_nombre") or "—"
    fecha       = fmt(evento.get("fecha_evento"))
    hora_ini    = fmt(evento.get("hora_inicio"))
    hora_fin    = fmt(evento.get("hora_final"))
    hora_misa   = fmt(evento.get("fecha_misa"))
    lugar       = evento.get("lugar_evento") or "—"
    dir_misa    = evento.get("direccion_misa") or "—"
    importe     = evento.get("importe") or "—"
    codigo      = evento.get("code") or "—"
    usuario     = evento.get("created_by_nombre") or "—"
    ciudad      = evento.get("nombre_ciudad") or "—"
    comentarios = evento.get("comentarios") or "—"
    now         = dt.datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0"
           style="background:#ffffff;border-radius:16px;overflow:hidden;
                  box-shadow:0 4px 16px rgba(0,0,0,0.08);max-width:580px;">

      <!-- Header -->
      <tr>
        <td style="background:#01369e;padding:24px 32px;">
          <table width="100%"><tr>
            <td>
              <div style="font-size:22px;font-weight:700;color:#ffffff;">HerrSoft Events</div>
              <div style="font-size:12px;color:#93c5fd;margin-top:2px;">Sistema de gestión</div>
            </td>
            <td align="right">
              <span style="background:rgba(255,255,255,0.18);color:#fff;font-size:11px;
                           font-weight:700;letter-spacing:0.06em;padding:4px 12px;border-radius:20px;">
                EVENTOS
              </span>
            </td>
          </tr></table>
        </td>
      </tr>

      <!-- Banner recordatorio -->
      <tr>
        <td style="background:#eff6ff;border-bottom:2px solid #bfdbfe;padding:14px 32px;">
          <div style="font-size:15px;font-weight:700;color:#01369e;">
            {icon} {banner_text}
          </div>
          <div style="font-size:12px;color:#3b82f6;margin-top:2px;">Enviado el {now}</div>
        </td>
      </tr>

      <!-- Título -->
      <tr>
        <td style="padding:24px 32px 0;">
          <div style="font-size:20px;font-weight:700;color:#111827;">{subject_label}</div>
          <div style="font-size:13px;color:#9ca3af;margin-top:4px;">Código: {codigo}</div>
        </td>
      </tr>

      <!-- Divider -->
      <tr><td style="padding:12px 32px 0;">
        <hr style="border:none;border-top:1px solid #f0f4f8;margin:0;">
      </td></tr>

      <!-- Cliente destacado -->
      <tr>
        <td style="padding:16px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:#f0f6ff;border:1px solid #bfdbfe;border-radius:12px;">
            <tr><td style="padding:16px 20px;">
              <div style="font-size:11px;color:#3b82f6;font-weight:700;text-transform:uppercase;
                           letter-spacing:0.06em;">Cliente</div>
              <div style="font-size:20px;font-weight:800;color:#01369e;margin-top:4px;">{cliente}</div>
              <div style="font-size:12px;color:#6b7280;margin-top:2px;">{ciudad}</div>
            </td></tr>
          </table>
        </td>
      </tr>

      <!-- Detalles -->
      <tr>
        <td style="padding:0 32px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0">

            <tr><td style="padding:10px 0;border-bottom:1px solid #f0f4f8;">
              <table width="100%"><tr>
                <td width="50%" style="padding-right:12px;">
                  <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;
                               letter-spacing:0.06em;margin-bottom:4px;">Fecha del evento</div>
                  <div style="font-size:14px;font-weight:600;color:#111827;">📅 {fecha}</div>
                </td>
                <td width="50%">
                  <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;
                               letter-spacing:0.06em;margin-bottom:4px;">Horario</div>
                  <div style="font-size:14px;font-weight:600;color:#111827;">🕐 {hora_ini} – {hora_fin}</div>
                </td>
              </tr></table>
            </td></tr>

            <tr><td style="padding:10px 0;border-bottom:1px solid #f0f4f8;">
              <table width="100%"><tr>
                <td width="50%" style="padding-right:12px;">
                  <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;
                               letter-spacing:0.06em;margin-bottom:4px;">Lugar del evento</div>
                  <div style="font-size:14px;color:#374151;">📍 {lugar}</div>
                </td>
                <td width="50%">
                  <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;
                               letter-spacing:0.06em;margin-bottom:4px;">Hora de misa</div>
                  <div style="font-size:14px;color:#374151;">⛪ {hora_misa}</div>
                </td>
              </tr></table>
            </td></tr>

            <tr><td style="padding:10px 0;border-bottom:1px solid #f0f4f8;">
              <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;
                           letter-spacing:0.06em;margin-bottom:4px;">Dirección misa</div>
              <div style="font-size:14px;color:#374151;">🗺️ {dir_misa}</div>
            </td></tr>

            <tr><td style="padding:10px 0;border-bottom:1px solid #f0f4f8;">
              <table width="100%"><tr>
                <td width="50%" style="padding-right:12px;">
                  <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;
                               letter-spacing:0.06em;margin-bottom:4px;">Importe</div>
                  <div style="font-size:16px;font-weight:700;color:#01369e;">💰 {importe}</div>
                </td>
                <td width="50%">
                  <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;
                               letter-spacing:0.06em;margin-bottom:4px;">Registrado por</div>
                  <div style="font-size:14px;color:#374151;">👤 {usuario}</div>
                </td>
              </tr></table>
            </td></tr>

            <tr><td style="padding:10px 0;">
              <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;
                           letter-spacing:0.06em;margin-bottom:4px;">Comentarios</div>
              <div style="font-size:14px;color:#374151;">{comentarios}</div>
            </td></tr>

          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f8fafc;border-top:1px solid #f0f4f8;padding:16px 32px;">
          <div style="font-size:11px;color:#9ca3af;text-align:center;">
            Correo generado automáticamente por <strong>HerrSoft Events</strong> · No respondas a este mensaje.
          </div>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>"""


# ── DB helpers ────────────────────────────────────────────────────────────────

def _get_evento_config() -> Dict[str, Any] | None:
    from ..db import get_connection
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT * FROM configuracion_eventos WHERE active=1 "
                "ORDER BY id_configuracion_evento DESC LIMIT 1"
            )
            return cur.fetchone()
    except Exception:
        return None
    finally:
        conn.close()


def _get_pending_eventos(time_field: str, mysql_interval: str, source_id: int) -> List[Dict[str, Any]]:
    """
    Returns events where:
      - reminder deadline passed  (event_time - INTERVAL <= NOW)
      - event hasn't started yet  (event_time > NOW)
      - reminder not sent yet     (not in recordatorios_correo_enviados)
    """
    from ..db import get_connection
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                f"""
                SELECT e.id_contrato, e.code, e.cliente_nombre, e.fecha_evento,
                       e.hora_inicio, e.hora_final, e.fecha_misa, e.lugar_evento,
                       e.direccion_misa, e.importe, e.comentarios,
                       u.name AS created_by_nombre,
                       c.nombre AS nombre_ciudad
                FROM contratos e
                LEFT JOIN users u ON u.id_user = e.id_user
                LEFT JOIN ciudades c ON c.id_ciudad = e.id_ciudad
                WHERE e.active = 1
                  AND e.{time_field} IS NOT NULL
                  AND (e.{time_field} - INTERVAL {mysql_interval}) <= NOW()
                  AND e.{time_field} > NOW()
                  AND e.id_contrato NOT IN (
                      SELECT id_evento FROM recordatorios_correo_enviados
                      WHERE source_id = %s
                  )
                """,
                (source_id,),
            )
            return cur.fetchall()
    except Exception:
        return []
    finally:
        conn.close()


def _mark_sent(id_evento: int, source_id: int) -> None:
    from ..db import get_connection
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT IGNORE INTO recordatorios_correo_enviados "
                "(id_evento, source_id, datetime_enviado) VALUES (%s, %s, NOW())",
                (id_evento, source_id),
            )
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()


# ── Main process ──────────────────────────────────────────────────────────────

def _process_reminders() -> None:
    from .email import send_email_bg, get_destinatarios_emails

    cfg = _get_evento_config()
    if not cfg:
        return

    for source_id, cfg_key, time_field, mysql_interval, label, icon in _REMINDERS:
        if not cfg.get(cfg_key):
            continue

        emails = get_destinatarios_emails(EVENTO_MODULO_CORREO, source_id)
        if not emails:
            continue

        eventos = _get_pending_eventos(time_field, mysql_interval, source_id)

        for evento in eventos:
            cliente = evento.get("cliente_nombre") or "Evento"
            subject = f"{icon} Recordatorio: {label} — {cliente}"
            html    = _evento_html(evento, f"Evento: {cliente}", icon, label)
            send_email_bg(emails, subject, html)
            _mark_sent(evento["id_contrato"], source_id)


def _run_loop() -> None:
    while True:
        try:
            _process_reminders()
        except Exception:
            pass
        time.sleep(_INTERVAL_SECONDS)


def start_reminder_scheduler() -> None:
    """Start the background reminder thread. Call once on app startup."""
    threading.Thread(target=_run_loop, daemon=True, name="reminder-scheduler").start()
