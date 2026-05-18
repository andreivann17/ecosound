from __future__ import annotations
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel, ConfigDict
from pathlib import Path as FsPath
import re
import datetime as dt
import shutil
from ..deps import get_current_user
from ..models import trabajadores as trab_model

UPLOADS_TRAB = FsPath("uploads/trabajadores")

router = APIRouter(prefix="/trabajadores", tags=["trabajadores"])


# ================== CONFIG: CORREO ==================

_CFG_TRAB_DDL = """
CREATE TABLE IF NOT EXISTS configuracion_trabajadores (
    id_configuracion_trabajador INT          AUTO_INCREMENT PRIMARY KEY,
    correo_crear_trabajador     TINYINT(1)   NOT NULL DEFAULT 0,
    id_user                     INT          NOT NULL DEFAULT 0,
    active                      TINYINT(1)   NOT NULL DEFAULT 1,
    datetime                    DATETIME     NOT NULL
)
"""

def _ensure_cfg_trabajadores(conn):
    with conn.cursor() as cur:
        cur.execute(_CFG_TRAB_DDL)
    conn.commit()


_TRAB_CORREO_DEFAULTS = {
    "correo_crear_trabajador": False,
}


@router.get("/config/correo")
def get_config_correo_trabajadores(
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    from ..db import get_connection
    conn = get_connection()
    try:
        _ensure_cfg_trabajadores(conn)
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT correo_crear_trabajador
                FROM configuracion_trabajadores
                WHERE active = 1
                ORDER BY id_configuracion_trabajador DESC
                LIMIT 1
                """
            )
            row = cur.fetchone()
        if not row:
            return _TRAB_CORREO_DEFAULTS.copy()
        return {k: bool(v) for k, v in row.items()}
    finally:
        conn.close()


class ConfigCorreoTrabajadores(BaseModel):
    correo_crear_trabajador: bool = False
    model_config = ConfigDict(extra="ignore")


@router.put("/config/correo", status_code=200)
def save_config_correo_trabajadores(
    payload: ConfigCorreoTrabajadores,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    from ..db import get_connection
    user_id = int(_cu.get("id") or _cu.get("id_user") or 0)
    now = dt.datetime.now()
    conn = get_connection()
    try:
        _ensure_cfg_trabajadores(conn)
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT id_configuracion_trabajador
                FROM configuracion_trabajadores
                WHERE active = 1
                ORDER BY id_configuracion_trabajador DESC
                LIMIT 1
                """
            )
            existing = cur.fetchone()

        if existing:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE configuracion_trabajadores SET
                        correo_crear_trabajador = %s,
                        datetime                = %s
                    WHERE id_configuracion_trabajador = %s
                    """,
                    (int(payload.correo_crear_trabajador), now, existing["id_configuracion_trabajador"]),
                )
        else:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO configuracion_trabajadores
                        (correo_crear_trabajador, id_user, active, datetime)
                    VALUES (%s, %s, 1, %s)
                    """,
                    (int(payload.correo_crear_trabajador), user_id, now),
                )
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}


# ================== SCHEMAS ==================

class PuestoCreate(BaseModel):
    nombre: str
    model_config = ConfigDict(extra="ignore")


class TrabajadorCreate(BaseModel):
    nombre: str
    apellido: str
    fecha_nacimiento: Optional[str] = None
    id_puesto: Optional[int] = None
    model_config = ConfigDict(extra="ignore")


class TrabajadorUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    id_puesto: Optional[int] = None
    model_config = ConfigDict(extra="ignore")


class ContratoTrabajadorCreate(BaseModel):
    id_trabajador: int
    id_puesto: Optional[int] = None
    model_config = ConfigDict(extra="ignore")


# ================== PUESTOS ==================

@router.get("/puestos")
def get_puestos(
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    return trab_model.list_puestos()


@router.post("/puestos", status_code=201)
def crear_puesto(
    payload: PuestoCreate,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    return trab_model.create_puesto(payload.nombre)


# ================== TRABAJADORES ==================

@router.get("")
def get_trabajadores(
    search: Optional[str] = Query(None),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    return trab_model.list_trabajadores(search=search)


@router.post("", status_code=201)
def crear_trabajador(
    payload: TrabajadorCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("id_user")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user ID")
    result = trab_model.create_trabajador(payload.model_dump(), int(user_id))
    item = trab_model.get_trabajador_by_id(result["id_trabajador"])
    return {"id_trabajador": result["id_trabajador"], "item": item}


@router.get("/{id_trabajador}")
def get_trabajador(
    id_trabajador: int,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = trab_model.get_trabajador_by_id(id_trabajador)
    if not row:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    return row


@router.patch("/{id_trabajador}")
def actualizar_trabajador(
    id_trabajador: int,
    payload: TrabajadorUpdate,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = trab_model.get_trabajador_by_id(id_trabajador)
    if not row:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    trab_model.update_trabajador(id_trabajador, data)
    item = trab_model.get_trabajador_by_id(id_trabajador)
    return {"updated": 1, "item": item}


@router.post("/{id_trabajador}/imagen", status_code=200)
async def subir_imagen_trabajador(
    id_trabajador: int,
    file: UploadFile = File(...),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = trab_model.get_trabajador_by_id(id_trabajador)
    if not row:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")

    dest_dir = UPLOADS_TRAB / str(id_trabajador)
    dest_dir.mkdir(parents=True, exist_ok=True)

    original_filename = file.filename
    safe_name = re.sub(r"[^\w.\-]", "_", original_filename)
    timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    stored_name = f"{timestamp}_{safe_name}"
    dest_path = dest_dir / stored_name

    with dest_path.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)

    rel_path = str(dest_path).replace("\\", "/")
    trab_model.update_trabajador_imagen(id_trabajador, original_filename, rel_path)

    return {"filename": original_filename, "path": rel_path}


@router.get("/{id_trabajador}/analisis")
def get_analisis_trabajador(
    id_trabajador: int,
    date_from: str = Query(...),
    date_to: str = Query(...),
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = trab_model.get_trabajador_by_id(id_trabajador)
    if not row:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    return trab_model.get_trabajador_analisis(id_trabajador, date_from, date_to)


@router.delete("/{id_trabajador}")
def eliminar_trabajador(
    id_trabajador: int,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    row = trab_model.get_trabajador_by_id(id_trabajador)
    if not row:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    trab_model.delete_trabajador(id_trabajador)
    return {"deleted": 1, "id_trabajador": id_trabajador}
