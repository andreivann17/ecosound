# app/routers/users.py
from typing import Any, Dict, Optional, List
import os
import secrets
import smtplib
from email.message import EmailMessage

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator

from ..deps import get_current_user
from ..models import users as users_model

router = APIRouter(prefix="/users", tags=["users"])

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
    return {"status": bool(updated)}

# =================================================
# ================= CRUD USUARIOS =================
# =================================================

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


@router.get("")
def list_users(
    search: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return users_model.list_users(search=search)


@router.post("", status_code=201)
def create_user(
    payload: UserCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    creator_id = current_user.get("id")
    if not creator_id:
        raise HTTPException(status_code=401, detail="Usuario inválido")

    try:
        code = users_model.create_user(
            name=payload.name.strip(),
            email=str(payload.email).lower().strip(),
            password_plain=payload.password,
            id_user_creation=int(creator_id),
        )
        return {"code": code}
    except users_model.EmailAlreadyExists as e:
        raise HTTPException(status_code=400, detail=str(e))

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


@router.delete("/{code}")
def delete_user(
    code: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    id_user = users_model.get_user_id_by_code(code)
    if not id_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    users_model.set_user_active_flag(id_user=id_user, active_value=0)
    return {"active": 0}

