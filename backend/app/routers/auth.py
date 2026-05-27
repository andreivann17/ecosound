from datetime import datetime, timedelta, date as _date
from typing import Any, Dict
import os
import jwt

from fastapi import APIRouter, HTTPException, status, Response, Request
from pydantic import BaseModel

from ..models.auth import authenticate
from ..models import users as users_model
from ..models import clientes as clientes_model

router = APIRouter(prefix="/auth", tags=["auth"])

USR_MODULO_CORREO = 4


def _send_login_correo(user_id: int, email: str) -> None:
    try:
        from ..db import get_connection as _gc
        from ..utils.email import send_email_bg, get_destinatarios_emails

        conn = _gc()
        try:
            with conn.cursor(dictionary=True) as cur:
                cur.execute(
                    "SELECT correo_inicio_sesion FROM configuracion_usuarios "
                    "WHERE active=1 ORDER BY id_configuracion_usuario DESC LIMIT 1"
                )
                row = cur.fetchone()
            if not row or not row.get("correo_inicio_sesion"):
                return
            with conn.cursor(dictionary=True) as cur:
                cur.execute("SELECT name FROM users WHERE id_user = %s LIMIT 1", (user_id,))
                urow = cur.fetchone()
        finally:
            conn.close()

        name = (urow or {}).get("name") or email
        emails = get_destinatarios_emails(USR_MODULO_CORREO, 2)
        if not emails:
            return

        now = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        html = f"""<!DOCTYPE html>
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
              <div style="font-size:12px;color:#93c5fd;margin-top:2px;">Sistema de gestión</div>
            </td>
            <td align="right">
              <span style="background:rgba(255,255,255,0.18);color:#fff;font-size:11px;
                           font-weight:700;letter-spacing:0.06em;padding:4px 12px;border-radius:20px;">
                USUARIOS
              </span>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td style="background:#eff6ff;border-bottom:2px solid #bfdbfe;padding:14px 32px;">
          <div style="font-size:15px;font-weight:700;color:#01369e;">🔑 Inicio de sesión detectado</div>
          <div style="font-size:12px;color:#3b82f6;margin-top:2px;">Enviado el {now}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:10px 0;border-bottom:1px solid #f0f4f8;">
              <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Usuario</div>
              <div style="font-size:16px;font-weight:700;color:#111827;">👤 {name}</div>
            </td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #f0f4f8;">
              <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Correo</div>
              <div style="font-size:14px;color:#374151;">{email}</div>
            </td></tr>
            <tr><td style="padding:10px 0;">
              <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Hora de acceso</div>
              <div style="font-size:14px;color:#374151;">🕐 {now}</div>
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
        send_email_bg(emails, f"🔑 Inicio de sesión — {name}", html)
    except Exception:
        pass

# =========================
# CONFIG
# =========================

SECRET_KEY = os.getenv("SECRET_KEY", "herrsoft-ecosound-jwt-secret-key-change-in-prod-2026")
ALGORITHM = "HS256"

ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "1440"))
REFRESH_TOKEN_DAYS = int(os.getenv("REFRESH_TOKEN_DAYS", "14"))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "0") == "1"   # 1 en prod HTTPS
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")   # lax | none | strict


# =========================
# SCHEMAS
# =========================

class LoginRequest(BaseModel):
    email: str
    password: str


# =========================
# TOKEN HELPERS
# =========================

def _create_access_token(*, user_id: int, role: str, id_cliente: int = 0) -> str:
    payload = {
        "id": user_id,
        "role": role,
        "type": "access",
        "id_cliente": id_cliente,
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _create_admin_token(*, user_id: int) -> str:
    payload = {
        "id": user_id,
        "role": "admin",
        "type": "access",
        "scope": "admin_panel",
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _create_refresh_token(*, user_id: int, role: str) -> str:
    payload = {
        "id": user_id,
        "role": role,
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# =========================
# LOGIN
# =========================

@router.post("/login")
def login(payload: LoginRequest, response: Response) -> Dict[str, Any]:
    try:
        role, user_id = authenticate(payload.email, payload.password)
    except ValueError as exc:
        if str(exc) == "multiple_roles":
            return {
                "message": "Este correo existe como paciente y administrador.",
                "options": ["admin", "patient"],
            }
        if str(exc) == "email_not_found":
            raise HTTPException(status_code=401, detail="Correo no registrado")
        if str(exc) == "invalid_password":
            raise HTTPException(status_code=401, detail="Contraseña incorrecta")
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    # Verificar si el usuario es un cliente con prueba vencida o cuenta desactivada
    try:
        user_info = users_model.get_user_by_email(payload.email)
        if user_info and user_info.get("usuario_cliente") == 1:
            id_cliente = user_info.get("id_cliente")
            if not user_info.get("active"):
                raise HTTPException(
                    status_code=403,
                    detail="Tu cuenta ha sido desactivada. Contacta al administrador.",
                )
            if id_cliente:
                trial = clientes_model.get_trial_status(id_app=1, id_cliente=int(id_cliente))
                fecha_fin = trial.get("fecha_fin_prueba")
                if fecha_fin:
                    fecha_fin_d = _date.fromisoformat(fecha_fin) if isinstance(fecha_fin, str) else fecha_fin
                    if fecha_fin_d < _date.today():
                        # Auto-desactivar y bloquear
                        clientes_model.update_cliente(
                            id_app=1, id_cliente=int(id_cliente),
                            data={"habilitar_sistema": False},
                        )
                        raise HTTPException(
                            status_code=403,
                            detail="Tu periodo de prueba ha vencido. Contacta al administrador para reactivar tu cuenta.",
                        )
    except HTTPException:
        raise
    except Exception:
        pass

    try:
        users_model.update_ultima_sesion(user_id)
    except Exception:
        pass

    try:
        print("1")
        _send_login_correo(user_id, payload.email)
    except Exception:
        pass
    print("2")
    tenant = users_model.get_user_tenant_info(user_id)
    print("3")
    access_token = _create_access_token(
        user_id=user_id, role=role,
        id_cliente=tenant["id_cliente"],
    )
    print("4")
    refresh_token = _create_refresh_token(user_id=user_id, role=role)
    print("5")
    # Refresh token → COOKIE HttpOnly
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=REFRESH_TOKEN_DAYS * 24 * 60 * 60,
        path="/auth/refresh",
    )
    print("6")

    return {
        "access_token": access_token,
        "role": role,
    }


# =========================
# LOGIN ADMIN
# =========================

@router.post("/login-admin")
def login_admin(payload: LoginRequest) -> Dict[str, Any]:
    from ..db import get_admin_connection
    from ..models.auth import _verify_password, _to_bytes

    conn = get_admin_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id_user, password FROM users WHERE email=%s AND active=1 LIMIT 1",
                (payload.email,),
            )
            row = cur.fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=401, detail="Correo no registrado")

    if not _verify_password(payload.password, _to_bytes(row["password"])):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    admin_token = _create_admin_token(user_id=row["id_user"])
    return {"access_token": admin_token}


# =========================
# REFRESH
# =========================

@router.post("/refresh")
def refresh(request: Request) -> Dict[str, Any]:
    refresh_token = request.cookies.get("refresh_token")

    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token no encontrado")

    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expirado")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Refresh token inválido")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token incorrecto")

    user_id = payload.get("id")
    role = payload.get("role")

    if not user_id or not role:
        raise HTTPException(status_code=401, detail="Refresh token inválido")

    tenant = users_model.get_user_tenant_info(user_id)
    new_access_token = _create_access_token(
        user_id=user_id, role=role,
        id_cliente=tenant["id_cliente"],
    )

    return {
        "access_token": new_access_token,
        "role": role,
    }


# =========================
# LOGOUT
# =========================

@router.post("/logout")
def logout(response: Response) -> Dict[str, Any]:
    response.delete_cookie(key="refresh_token", path="/auth/refresh")
    return {"status": True}
