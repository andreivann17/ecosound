# app/routers/users.py
from typing import Any, Dict, Optional, List
import os
import secrets
import smtplib
from email.message import EmailMessage

from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from pathlib import Path as FsPath
import re
import shutil

from ..deps import get_current_user, get_tenant_filter
from ..models import users as users_model

router = APIRouter(prefix="/users", tags=["users"])

UPLOADS_USERS = FsPath("uploads/usuarios")
UPLOADS_PERFIL = FsPath("uploads/perfil")

# =================================================
# ============== RESET PASSWORD ===================
# =================================================

class EmailRequest(BaseModel):
    email: EmailStr


class CodeValidationRequest(BaseModel):
    email: EmailStr
    code: str


class NewPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    password: str


# -------- Email --------

SMTP_USER = "andreivann17@gmail.com"  # p.ej. tu Gmail
SMTP_PASS = "ogom dsez qnze ihmv"  # app password de Gmail
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


def send_reset_email(email: str, token: str) -> None:
    if not SMTP_USER or not SMTP_PASS:
        raise RuntimeError("SMTP no configurado")

    msg = EmailMessage()
    msg["From"] = f'"Despacho Jurídico" <{SMTP_USER}>'
    msg["To"] = email
    msg["Subject"] = "Restablecimiento de contraseña"
    msg.set_content(
        f"""
Estimado(a) usuario(a),

Se solicitó un restablecimiento de contraseña.

Código de verificación:
{token}

Si no solicitó este cambio, ignore este mensaje.

Atentamente,
Despacho Jurídico
"""
    )

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)


# -------- Endpoints --------

@router.post("/email/")
def send_reset_code(payload: EmailRequest):
    user = users_model.get_user_by_email(payload.email)
    if not user:
        return {"status": False}

    token = secrets.token_hex(5)
    users_model.save_reset_token(email=payload.email, code=token)

    try:
        send_reset_email(payload.email, token)
        return {"status": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate-code/")
def validate_code(payload: CodeValidationRequest):
    ok = users_model.validate_reset_code(payload.email, payload.code)
    return {"status": ok}


@router.post("/new-password/")
def set_new_password(payload: NewPasswordRequest):
    # 1) validar y CONSUMIR código
    valid = users_model.consume_reset_code(
        email=payload.email,
        code=payload.code
    )
    if not valid:
        return {"status": False}

    # 2) actualizar password
    updated = users_model.update_user_password(
        email=payload.email,
        new_plain_password=payload.password
    )
    if updated:
        import datetime as _dt
        _send_correo_usuario(
            source_id=3,
            cfg_flag="correo_recuperar_password",
            titulo=f"Contraseña restablecida: {payload.email}",
            icon="🔐",
            banner="Un usuario recuperó su contraseña",
            filas=[
                ("Correo", payload.email),
                ("Hora",   _dt.datetime.now().strftime("%d/%m/%Y %H:%M")),
            ],
        )
    return {"status": bool(updated)}

# =================================================
# ================= CRUD USUARIOS =================
# =================================================

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


# ================== CONFIG: CORREO ==================

_CFG_USR_DDL = """
CREATE TABLE IF NOT EXISTS configuracion_usuarios (
    id_configuracion_usuario  INT        AUTO_INCREMENT PRIMARY KEY,
    correo_crear_usuario      TINYINT(1) NOT NULL DEFAULT 0,
    correo_inicio_sesion      TINYINT(1) NOT NULL DEFAULT 0,
    correo_recuperar_password TINYINT(1) NOT NULL DEFAULT 0,
    id_user                   INT        NOT NULL DEFAULT 0,
    id_cliente                INT        NOT NULL DEFAULT 0,
    active                    TINYINT(1) NOT NULL DEFAULT 1,
    datetime                  DATETIME   NOT NULL
)
"""

def _ensure_cfg_usuarios(conn):
    with conn.cursor() as cur:
        cur.execute(_CFG_USR_DDL)
        cur.execute("SHOW COLUMNS FROM configuracion_usuarios LIKE 'id_cliente'")
        if not cur.fetchone():
            cur.execute("ALTER TABLE configuracion_usuarios ADD COLUMN id_cliente INT NOT NULL DEFAULT 0")
    conn.commit()


_USR_CORREO_DEFAULTS = {
    "correo_crear_usuario":      False,
    "correo_inicio_sesion":      False,
    "correo_recuperar_password": False,
}


@router.get("/config/correo")
def get_config_correo_usuarios(
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    from ..db import get_connection
    conn = get_connection()
    try:
        _ensure_cfg_usuarios(conn)
        with conn.cursor(dictionary=True) as cur:
            if tenant_id is not None:
                cur.execute(
                    """
                    SELECT correo_crear_usuario, correo_inicio_sesion, correo_recuperar_password
                    FROM configuracion_usuarios
                    WHERE active = 1 AND id_cliente = %s
                    ORDER BY id_configuracion_usuario DESC
                    LIMIT 1
                    """,
                    (tenant_id,),
                )
            else:
                cur.execute(
                    """
                    SELECT correo_crear_usuario, correo_inicio_sesion, correo_recuperar_password
                    FROM configuracion_usuarios
                    WHERE active = 1
                    ORDER BY id_configuracion_usuario DESC
                    LIMIT 1
                    """
                )
            row = cur.fetchone()
        if not row:
            return _USR_CORREO_DEFAULTS.copy()
        return {k: bool(v) for k, v in row.items()}
    finally:
        conn.close()


class ConfigCorreoUsuarios(BaseModel):
    correo_crear_usuario:      bool = False
    correo_inicio_sesion:      bool = False
    correo_recuperar_password: bool = False
    model_config = ConfigDict(extra="ignore")


@router.put("/config/correo", status_code=200)
def save_config_correo_usuarios(
    payload: ConfigCorreoUsuarios,
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    from ..db import get_connection
    import datetime as _dt
    user_id = int(current_user.get("id") or current_user.get("id_user") or 0)
    id_cliente_val = tenant_id if tenant_id is not None else 0
    now = _dt.datetime.now()
    conn = get_connection()
    try:
        _ensure_cfg_usuarios(conn)
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT id_configuracion_usuario
                FROM configuracion_usuarios
                WHERE active = 1 AND id_cliente = %s
                ORDER BY id_configuracion_usuario DESC
                LIMIT 1
                """,
                (id_cliente_val,),
            )
            existing = cur.fetchone()

        if existing:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE configuracion_usuarios SET
                        correo_crear_usuario      = %s,
                        correo_inicio_sesion      = %s,
                        correo_recuperar_password = %s,
                        datetime                  = %s
                    WHERE id_configuracion_usuario = %s
                    """,
                    (
                        int(payload.correo_crear_usuario),
                        int(payload.correo_inicio_sesion),
                        int(payload.correo_recuperar_password),
                        now,
                        existing["id_configuracion_usuario"],
                    ),
                )
        else:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO configuracion_usuarios
                        (correo_crear_usuario, correo_inicio_sesion, correo_recuperar_password,
                         id_user, id_cliente, active, datetime)
                    VALUES (%s, %s, %s, %s, %s, 1, %s)
                    """,
                    (
                        int(payload.correo_crear_usuario),
                        int(payload.correo_inicio_sesion),
                        int(payload.correo_recuperar_password),
                        user_id,
                        id_cliente_val,
                        now,
                    ),
                )
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}


USR_MODULO_CORREO = 4  # id_modulo en configuracion_correos


def _cfg_usuarios_flag(flag_key: str) -> bool:
    from ..db import get_connection as _gc
    conn = _gc()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                f"SELECT {flag_key} FROM configuracion_usuarios "
                "WHERE active=1 ORDER BY id_configuracion_usuario DESC LIMIT 1"
            )
            row = cur.fetchone()
        return bool(row and row.get(flag_key))
    except Exception:
        return False
    finally:
        conn.close()


def _usuario_html(titulo: str, icon: str, banner_text: str, filas: list) -> str:
    import datetime as _dt
    now = _dt.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    rows_html = ""
    for label, valor in filas:
        rows_html += f"""
        <tr><td style="padding:10px 0;border-bottom:1px solid #f0f4f8;">
          <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;
                       letter-spacing:0.06em;margin-bottom:4px;">{label}</div>
          <div style="font-size:14px;font-weight:600;color:#111827;">{valor or "—"}</div>
        </td></tr>"""
    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0"
           style="background:#ffffff;border-radius:16px;overflow:hidden;
                  box-shadow:0 4px 16px rgba(0,0,0,0.08);max-width:580px;">
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
                USUARIOS
              </span>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td style="background:#eff6ff;border-bottom:2px solid #bfdbfe;padding:14px 32px;">
          <div style="font-size:15px;font-weight:700;color:#01369e;">{icon} {banner_text}</div>
          <div style="font-size:12px;color:#3b82f6;margin-top:2px;">Enviado el {now}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px 0;">
          <div style="font-size:20px;font-weight:700;color:#111827;">{titulo}</div>
        </td>
      </tr>
      <tr><td style="padding:12px 32px 0;">
        <hr style="border:none;border-top:1px solid #f0f4f8;margin:0;">
      </td></tr>
      <tr>
        <td style="padding:16px 32px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            {rows_html}
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


def _send_correo_usuario(source_id: int, cfg_flag: str, titulo: str, icon: str, banner: str, filas: list) -> None:
    try:
        if not _cfg_usuarios_flag(cfg_flag):
            return
        from ..utils.email import send_email_bg, get_destinatarios_emails
        emails = get_destinatarios_emails(USR_MODULO_CORREO, source_id)
        if not emails:
            return
        html = _usuario_html(titulo, icon, banner, filas)
        send_email_bg(emails, f"{icon} {banner}", html)
    except Exception:
        pass


@router.get("")
def list_users(
    search: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    return users_model.list_users(search=search, id_cliente=tenant_id)


@router.post("", status_code=201)
def create_user(
    payload: UserCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    creator_id = current_user.get("id")
    if not creator_id:
        raise HTTPException(status_code=401, detail="Usuario inválido")

    try:
        name_clean  = payload.name.strip()
        email_clean = str(payload.email).lower().strip()
        code = users_model.create_user(
            name=name_clean,
            email=email_clean,
            password_plain=payload.password,
            id_user_creation=int(creator_id),
        )
        import datetime as _dt
        _send_correo_usuario(
            source_id=1,
            cfg_flag="correo_crear_usuario",
            titulo=f"Nuevo usuario: {name_clean}",
            icon="👤",
            banner="Nuevo usuario registrado en el sistema",
            filas=[
                ("Nombre",   name_clean),
                ("Correo",   email_clean),
                ("Hora",     _dt.datetime.now().strftime("%d/%m/%Y %H:%M")),
            ],
        )
        return {"code": code}
    except users_model.EmailAlreadyExists as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/me/perfil")
def get_my_perfil(current_user: Dict[str, Any] = Depends(get_current_user)):
    id_user = int(current_user.get("id") or current_user.get("id_user") or 0)
    if not id_user:
        raise HTTPException(status_code=401, detail="Usuario inválido")
    user = users_model.get_user_full_by_id(id_user)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    perfil = users_model.get_user_perfil(id_user)
    nombre = perfil.get("nombre") or user.get("name", "")
    ultima_sesion = perfil.get("ultima_sesion") or user.get("ultmo_inicio_sesion")
    return {
        "id": id_user,
        "code": user.get("code", ""),
        "name": nombre,
        "email": user.get("email", ""),
        "datetime": user.get("datetime", ""),
        **perfil,
        "ultima_sesion": ultima_sesion,
    }


class PerfilUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    telefono: Optional[str] = None
    model_config = ConfigDict(extra="ignore")


@router.patch("/me/perfil")
def update_my_perfil(
    payload: PerfilUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    id_user = int(current_user.get("id") or current_user.get("id_user") or 0)
    if not id_user:
        raise HTTPException(status_code=401, detail="Usuario inválido")
    data = payload.model_dump(exclude_none=True)
    if data:
        users_model.upsert_user_perfil(id_user, data)
        if "nombre" in data:
            users_model.update_user(id_user=id_user, data={"name": data["nombre"]})
    return {"ok": True}


class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str


@router.post("/me/change-password")
def change_my_password(
    payload: ChangePasswordPayload,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    id_user = int(current_user.get("id") or current_user.get("id_user") or 0)
    if not id_user:
        raise HTTPException(status_code=401, detail="Usuario inválido")
    ok = users_model.change_own_password(id_user, payload.current_password, payload.new_password)
    if not ok:
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    return {"ok": True}


@router.post("/me/imagen", status_code=200)
async def upload_my_imagen(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    import datetime as _dt
    id_user = int(current_user.get("id") or current_user.get("id_user") or 0)
    if not id_user:
        raise HTTPException(status_code=401, detail="Usuario inválido")

    dest_dir = UPLOADS_PERFIL / str(id_user)
    dest_dir.mkdir(parents=True, exist_ok=True)

    original_filename = file.filename or "imagen"
    safe_name = re.sub(r"[^\w.\-]", "_", original_filename)
    timestamp = _dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    stored_name = f"{timestamp}_{safe_name}"
    dest_path = dest_dir / stored_name

    with dest_path.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)

    from ..utils.comprimir import compress_file_best_effort
    dest_path = compress_file_best_effort(dest_path, max_image_dimension=800)
    rel_path = str(dest_path).replace("\\", "/")
    users_model.update_perfil_imagen(id_user, original_filename, rel_path)
    return {"path": rel_path, "filename": original_filename}


@router.get("/me")
def read_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Devuelve datos reales del usuario autenticado,
    consultando la base de datos usando el id del token.
    """
    id_user = current_user.get("id") or current_user.get("id_user")
    if not id_user:
        raise HTTPException(status_code=401, detail="Usuario inválido")

    user = users_model.get_user_by_id(int(id_user))
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return {
        "status": True,
        "user": {
            "id": user["id_user"],
            "name": user["name"],
            "email": user["email"],
            "code": user.get("code"),
            "role": user.get("role"),
        },
    }

@router.get("/{code}")
def get_user(code: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    row = users_model.get_user_by_code(code)
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return row


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    active: Optional[int] = None
    model_config = ConfigDict(extra="allow")


@router.patch("/{code}")
def update_user(
    code: str,
    payload: UserUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    id_user = users_model.get_user_id_by_code(code)
    if not id_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    data = payload.model_dump(exclude_none=True)
    updated = users_model.update_user(id_user=id_user, data=data)
    
    return {"updated": updated}


@router.post("/{code}/imagen", status_code=200)
async def upload_user_imagen(
    code: str,
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    row = users_model.get_user_by_code(code)
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    suffix = (FsPath(file.filename or "img").suffix or ".jpg").lstrip(".").lower()
    ext = re.sub(r"[^a-z0-9]", "", suffix) or "jpg"
    folder = UPLOADS_USERS / code
    folder.mkdir(parents=True, exist_ok=True)
    filename = f"perfil.{ext}"
    dest = folder / filename
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    from ..utils.comprimir import compress_file_best_effort
    dest = compress_file_best_effort(dest, max_image_dimension=800)
    filename = dest.name
    path_str = f"uploads/usuarios/{code}/{filename}"
    users_model.update_user_imagen(code=code, filename=filename, path=path_str)
    return {"path": path_str, "filename": filename}


@router.get("/me/permisos")
def get_my_permisos(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    id_user = int(current_user.get("id") or current_user.get("id_user") or 0)
    if not id_user:
        raise HTTPException(status_code=401, detail="Usuario inválido")
    return users_model.get_user_permissions(id_user)


@router.get("/{code}/permisos")
def get_permisos(
    code: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    id_user = users_model.get_user_id_by_code(code)
    if not id_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return users_model.get_user_permissions(id_user)


class PermisosPayload(BaseModel):
    permisos: Dict[str, Dict[str, bool]]
    model_config = ConfigDict(extra="ignore")


@router.put("/{code}/permisos")
def save_permisos(
    code: str,
    payload: PermisosPayload,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    id_user = users_model.get_user_id_by_code(code)
    if not id_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    creator_id = int(current_user.get("id") or current_user.get("id_user") or 0)
    users_model.save_user_permissions(id_user, payload.permisos, id_user_created=creator_id)
    return {"saved": True}


@router.delete("/{code}")
def delete_user(
    code: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    id_user = users_model.get_user_id_by_code(code)
    if not id_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if users_model.get_user_cliente_flag(id_user) == 1:
        raise HTTPException(
            status_code=403,
            detail="Este usuario pertenece a un cliente de Events y no puede eliminarse desde aquí.",
        )

    users_model.set_user_active_flag(id_user=id_user, active_value=0)
    return {"active": 0}

