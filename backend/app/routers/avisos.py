from __future__ import annotations
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import get_admin_connection
from ..deps import get_current_user, get_tenant_filter

router = APIRouter(prefix="/avisos", tags=["avisos"])

ID_APP_SISTEMA = 1
ID_APP_USER    = 2


@router.get("")
def list_avisos(
    _cu: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    conn = get_admin_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            if tenant_id is not None:
                cur.execute(
                    "SELECT id_aviso, descripcion, id_app FROM avisos "
                    "WHERE active = 1 AND id_app IN (%s, %s) AND id_cliente = %s",
                    (ID_APP_SISTEMA, ID_APP_USER, tenant_id),
                )
            else:
                cur.execute(
                    "SELECT id_aviso, descripcion, id_app FROM avisos "
                    "WHERE active = 1 AND id_app IN (%s, %s)",
                    (ID_APP_SISTEMA, ID_APP_USER),
                )
            rows = cur.fetchall()
        return [
            {
                "id_aviso": r["id_aviso"],
                "descripcion": r["descripcion"],
                "tipo": "app" if r["id_app"] == ID_APP_USER else "sistema",
            }
            for r in rows
        ]
    finally:
        conn.close()


class AvisoCreate(BaseModel):
    descripcion: str


@router.post("")
def create_aviso(
    body: AvisoCreate,
    _cu: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    descripcion = body.descripcion.strip()
    if not descripcion:
        raise HTTPException(status_code=400, detail="La descripción no puede estar vacía")

    conn = get_admin_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "INSERT INTO avisos (descripcion, active, id_cliente, id_app) "
                "VALUES (%s, 1, %s, %s)",
                (descripcion, tenant_id, ID_APP_USER),
            )
            conn.commit()
            new_id = cur.lastrowid
        return {"id_aviso": new_id, "descripcion": descripcion, "tipo": "app"}
    finally:
        conn.close()


@router.delete("/{id_aviso}")
def delete_aviso(
    id_aviso: int,
    _cu: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    conn = get_admin_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            if tenant_id is not None:
                cur.execute(
                    "DELETE FROM avisos WHERE id_aviso = %s AND id_app = %s AND id_cliente = %s",
                    (id_aviso, ID_APP_USER, tenant_id),
                )
            else:
                cur.execute(
                    "DELETE FROM avisos WHERE id_aviso = %s AND id_app = %s",
                    (id_aviso, ID_APP_USER),
                )
            conn.commit()
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Aviso no encontrado")
        return {"ok": True}
    finally:
        conn.close()
