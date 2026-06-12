# app/routers/general.py
from typing import Any, Dict, Optional
import re
import shutil
import datetime as dt

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pathlib import Path as FsPath
from pydantic import BaseModel, ConfigDict

from ..deps import get_current_user, get_tenant_filter

router = APIRouter(prefix="/general", tags=["general"])

# ── Configuración de empresa ───────────────────────────────────────────────

@router.get("/empresa")
def get_empresa(
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    from ..db import get_connection
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            if tenant_id:
                cur.execute(
                    "SELECT id_configuracion_empresa, nombre_empresa, path, filename, datetime "
                    "FROM configuracion_empresas WHERE id_cliente = %s "
                    "ORDER BY id_configuracion_empresa DESC LIMIT 1",
                    (tenant_id,),
                )
            else:
                cur.execute(
                    "SELECT id_configuracion_empresa, nombre_empresa, path, filename, datetime "
                    "FROM configuracion_empresas ORDER BY id_configuracion_empresa DESC LIMIT 1"
                )
            return cur.fetchone() or {}
    finally:
        conn.close()


@router.post("/empresa", status_code=200)
async def save_empresa(
    nombre_empresa: str = Form(...),
    logo: Optional[UploadFile] = File(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    from ..db import get_connection
    from ..utils.comprimir import compress_file_best_effort

    user_id = current_user.get("id") or current_user.get("id_user")
    id_cliente = tenant_id or 0

    rel_path = None
    filename_stored = None

    if logo and logo.filename:
        dest_dir = FsPath("uploads") / str(id_cliente) / "empresa"
        dest_dir.mkdir(parents=True, exist_ok=True)

        original_filename = logo.filename
        safe_name = re.sub(r"[^\w.\-]", "_", original_filename)
        timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
        stored_name = f"{timestamp}_{safe_name}"
        dest_path = dest_dir / stored_name

        with dest_path.open("wb") as fh:
            shutil.copyfileobj(logo.file, fh)

        dest_path = compress_file_best_effort(dest_path)
        rel_path = str(dest_path).replace("\\", "/")
        filename_stored = original_filename

    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            if tenant_id:
                cur.execute(
                    "SELECT id_configuracion_empresa, path FROM configuracion_empresas WHERE id_cliente = %s ORDER BY id_configuracion_empresa DESC LIMIT 1",
                    (tenant_id,),
                )
            else:
                cur.execute(
                    "SELECT id_configuracion_empresa, path FROM configuracion_empresas ORDER BY id_configuracion_empresa DESC LIMIT 1"
                )
            existing = cur.fetchone()

        with conn.cursor() as cur2:
            if existing:
                eid = existing["id_configuracion_empresa"]
                if rel_path:
                    cur2.execute(
                        "UPDATE configuracion_empresas SET nombre_empresa=%s, path=%s, filename=%s, datetime=%s, id_user=%s WHERE id_configuracion_empresa=%s",
                        (nombre_empresa.strip(), rel_path, filename_stored, dt.datetime.now(), user_id, eid),
                    )
                else:
                    cur2.execute(
                        "UPDATE configuracion_empresas SET nombre_empresa=%s, datetime=%s, id_user=%s WHERE id_configuracion_empresa=%s",
                        (nombre_empresa.strip(), dt.datetime.now(), user_id, eid),
                    )
                    rel_path = existing.get("path")
            else:
                cur2.execute(
                    "INSERT INTO configuracion_empresas (nombre_empresa, path, filename, datetime, id_user, id_cliente) VALUES (%s,%s,%s,%s,%s,%s)",
                    (nombre_empresa.strip(), rel_path, filename_stored, dt.datetime.now(), user_id, tenant_id),
                )
        conn.commit()
    finally:
        conn.close()

    return {"ok": True, "nombre_empresa": nombre_empresa.strip(), "path": rel_path}

# ── Ciudades ───────────────────────────────────────────────────────────────

class CiudadCreate(BaseModel):
    nombre: str
    color_hex: str = "#1677FF"


class CiudadUpdate(BaseModel):
    nombre: Optional[str] = None
    color_hex: Optional[str] = None
    model_config = ConfigDict(extra="ignore")


@router.get("/ciudades")
def list_ciudades(
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    if not tenant_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    from ..db import get_connection
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id_ciudad, nombre, color_hex FROM ciudades WHERE active = 1 AND id_cliente = %s ORDER BY nombre",
                (tenant_id,),
            )
            return cur.fetchall()
    finally:
        conn.close()


@router.post("/ciudades", status_code=201)
def create_ciudad(
    payload: CiudadCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    from ..db import get_connection
    nombre = payload.nombre.strip()
    if not nombre:
        raise HTTPException(status_code=422, detail="nombre requerido")
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO ciudades (nombre, color_hex, active, id_cliente) VALUES (%s, %s, 1, %s)",
                (nombre, payload.color_hex, tenant_id),
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
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    from ..db import get_connection
    data = payload.model_dump(exclude_none=True)
    if not data:
        return {"ok": True}
    conn = get_connection()
    try:
        sets = ", ".join(f"{k} = %s" for k in data)
        vals = list(data.values()) + [id_ciudad, tenant_id]
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE ciudades SET {sets} WHERE id_ciudad = %s AND id_cliente = %s AND active = 1",
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
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    from ..db import get_connection
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE ciudades SET active = 0 WHERE id_ciudad = %s AND id_cliente = %s",
                (id_ciudad, tenant_id),
            )
            conn.commit()
        return {"ok": True}
    finally:
        conn.close()
