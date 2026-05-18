# app/routers/general.py
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, ConfigDict

from ..deps import get_current_user

router = APIRouter(prefix="/general", tags=["general"])

# ── Ciudades ───────────────────────────────────────────────────────────────

class CiudadCreate(BaseModel):
    nombre: str
    color_hex: str = "#1677FF"


class CiudadUpdate(BaseModel):
    nombre: Optional[str] = None
    color_hex: Optional[str] = None
    model_config = ConfigDict(extra="ignore")


@router.get("/ciudades")
def list_ciudades(current_user: Dict[str, Any] = Depends(get_current_user)):
    from ..db import get_connection
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id_ciudad, nombre, color_hex FROM ciudades WHERE active = 1 ORDER BY nombre"
            )
            return cur.fetchall()
    finally:
        conn.close()


@router.post("/ciudades", status_code=201)
def create_ciudad(
    payload: CiudadCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    from ..db import get_connection
    nombre = payload.nombre.strip()
    if not nombre:
        raise HTTPException(status_code=422, detail="nombre requerido")
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO ciudades (nombre, color_hex, active) VALUES (%s, %s, 1)",
                (nombre, payload.color_hex),
            )
            conn.commit()
            new_id = cur.lastrowid
        return {"id_ciudad": new_id, "nombre": nombre, "color_hex": payload.color_hex}
    finally:
        conn.close()


@router.patch("/ciudades/{id_ciudad}")
def update_ciudad(
    id_ciudad: int,
    payload: CiudadUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    from ..db import get_connection
    data = payload.model_dump(exclude_none=True)
    if not data:
        return {"ok": True}
    conn = get_connection()
    try:
        sets = ", ".join(f"{k} = %s" for k in data)
        vals = list(data.values()) + [id_ciudad]
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE ciudades SET {sets} WHERE id_ciudad = %s AND active = 1",
                vals,
            )
            conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@router.delete("/ciudades/{id_ciudad}")
def delete_ciudad(
    id_ciudad: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    from ..db import get_connection
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE ciudades SET active = 0 WHERE id_ciudad = %s", (id_ciudad,))
            conn.commit()
        return {"ok": True}
    finally:
        conn.close()
