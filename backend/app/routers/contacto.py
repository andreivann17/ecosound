from __future__ import annotations
from typing import Optional
import datetime as dt

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ..db import get_connection
from ..utils.email import send_email_bg

router = APIRouter(prefix="/contacto", tags=["contacto"])

CONTACTO_EMAIL_DESTINO = ["andreivann17@gmail.com", "grupoeco.slrc@gmail.com"]


class ContactoPayload(BaseModel):
    responsable: str
    empresa: Optional[str] = ""
    correo: str
    celular: str
    direccion: Optional[str] = ""
    mensaje: Optional[str] = ""
    zona: Optional[str] = ""
    via: str  # "correo" | "whatsapp"


def _build_html(p: ContactoPayload, ip: str, now_str: str) -> str:
    via_label = "Correo electrónico" if p.via == "correo" else "WhatsApp"
    mensaje_html = (p.mensaje or "").replace("\n", "<br/>") or "<em>(sin mensaje)</em>"
    rows = [
        ("Responsable", p.responsable),
        ("Empresa / Negocio", p.empresa or "—"),
        ("Correo", p.correo),
        ("Celular", p.celular),
        ("Dirección", p.direccion or "—"),
        ("Zona", p.zona or "—"),
        ("Vía solicitada", via_label),
        ("IP", ip),
    ]
    rows_html = "".join(
        f"""<tr><td style="padding:10px 0;border-bottom:1px solid #f0f4f8;">
          <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">{label}</div>
          <div style="font-size:14px;color:#111827;">{value}</div>
        </td></tr>"""
        for label, value in rows
    )
    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:16px;overflow:hidden;
                  box-shadow:0 4px 16px rgba(0,0,0,0.08);max-width:580px;">
      <tr>
        <td style="background:#01369e;padding:24px 32px;">
          <table width="100%"><tr>
            <td>
              <div style="font-size:22px;font-weight:700;color:#fff;">HerrSoft Events</div>
              <div style="font-size:12px;color:#93c5fd;margin-top:2px;">Solicitud de demo</div>
            </td>
            <td align="right">
              <span style="background:rgba(255,255,255,0.18);color:#fff;font-size:11px;
                           font-weight:700;letter-spacing:0.06em;padding:4px 12px;border-radius:20px;">
                CONTACTO
              </span>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td style="background:#eff6ff;border-bottom:2px solid #bfdbfe;padding:14px 32px;">
          <div style="font-size:15px;font-weight:700;color:#01369e;">📩 Nueva solicitud de demo</div>
          <div style="font-size:12px;color:#3b82f6;margin-top:2px;">Enviado el {now_str}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            {rows_html}
            <tr><td style="padding:14px 0 4px 0;">
              <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Mensaje</div>
              <div style="font-size:14px;color:#374151;line-height:1.5;">{mensaje_html}</div>
            </td></tr>
          </table>
        </td>
      </tr>
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


@router.post("/demo")
def create_contacto_demo(payload: ContactoPayload, request: Request):
    if not payload.responsable.strip() or not payload.correo.strip() or not payload.celular.strip():
        raise HTTPException(status_code=422, detail="Faltan campos requeridos")

    via = payload.via if payload.via in ("correo", "whatsapp") else "correo"
    is_correo = 1 if via == "correo" else 0
    is_whatsapp = 1 if via == "whatsapp" else 0
    ip = request.client.host if request.client else ""
    now = dt.datetime.now()

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO contacto
                  (responsable, empresa, correo, celular, direccion, active,
                   datetime, is_correo, is_whatsapp, ip, zona, mensaje)
                VALUES (%s, %s, %s, %s, %s, 1, %s, %s, %s, %s, %s, %s)
                """,
                (
                    payload.responsable.strip(),
                    (payload.empresa or "").strip(),
                    payload.correo.strip(),
                    payload.celular.strip(),
                    (payload.direccion or "").strip(),
                    now,
                    is_correo,
                    is_whatsapp,
                    ip,
                    (payload.zona or "").strip(),
                    (payload.mensaje or "").strip(),
                ),
            )
            conn.commit()
            new_id = cur.lastrowid
    finally:
        conn.close()

    try:
        html = _build_html(payload, ip, now.strftime("%d/%m/%Y %H:%M:%S"))
        subject = f"📩 Nueva solicitud de demo — {payload.responsable.strip()}"
        send_email_bg(CONTACTO_EMAIL_DESTINO, subject, html)
    except Exception:
        pass

    return {"ok": True, "id_contacto": new_id}
