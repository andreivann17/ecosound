from datetime import datetime, timedelta
from typing import Any, Dict
import os
import jwt

from fastapi import APIRouter, HTTPException, status, Response, Request
from pydantic import BaseModel

from ..models.auth import authenticate

router = APIRouter(prefix="/auth", tags=["auth"])

# =========================
# CONFIG
# =========================

SECRET_KEY = os.getenv("SECRET_KEY", "secret")
ALGORITHM = "HS256"

ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "1440"))
REFRESH_TOKEN_DAYS = int(os.getenv("REFRESH_TOKEN_DAYS", "14"))


print(ACCESS_TOKEN_MINUTES)
print(REFRESH_TOKEN_DAYS)
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

def _create_access_token(*, user_id: int, role: str) -> str:
    payload = {
        "id": user_id,
        "role": role,
        "type": "access",
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

    access_token = _create_access_token(user_id=user_id, role=role)
    refresh_token = _create_refresh_token(user_id=user_id, role=role)

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

    return {
        "access_token": access_token,
        "role": role,
    }


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

    new_access_token = _create_access_token(user_id=user_id, role=role)

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
