from fastapi import APIRouter, Depends
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import datetime as dt

from ..deps import get_current_user, get_tenant_filter

router = APIRouter(prefix="/config/correo", tags=["config-correo"])


class DestinatariosPayload(BaseModel):
    id_modulo: int
    source_id: int
    user_ids: List[int]


def _ensure_id_cliente_correos(conn):
    with conn.cursor() as cur:
        cur.execute("SHOW COLUMNS FROM configuracion_correos LIKE 'id_cliente'")
        if not cur.fetchone():
            cur.execute("ALTER TABLE configuracion_correos ADD COLUMN id_cliente INT NOT NULL DEFAULT 0")
    conn.commit()


@router.get("/destinatarios")
def get_destinatarios(
    id_modulo: int,
    source_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    from ..db import get_connection
    conn = get_connection()
    try:
        _ensure_id_cliente_correos(conn)
        id_cliente_val = tenant_id if tenant_id is not None else 0
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id_user_envio FROM configuracion_correos "
                "WHERE id_modulo = %s AND source_id = %s AND active = 1 AND id_cliente = %s",
                (id_modulo, source_id, id_cliente_val),
            )
            rows = cur.fetchall()
        return {"user_ids": [r["id_user_envio"] for r in rows]}
    finally:
        conn.close()


@router.put("/destinatarios")
def set_destinatarios(
    payload: DestinatariosPayload,
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    from ..db import get_connection
    user_id = current_user.get("id")
    id_cliente_val = tenant_id if tenant_id is not None else 0
    now = dt.datetime.now()
    conn = get_connection()
    try:
        _ensure_id_cliente_correos(conn)
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM configuracion_correos WHERE id_modulo = %s AND source_id = %s AND id_cliente = %s",
                (payload.id_modulo, payload.source_id, id_cliente_val),
            )
            for uid in payload.user_ids:
                cur.execute(
                    "INSERT INTO configuracion_correos "
                    "(id_modulo, source_id, id_user_envio, active, id_user, id_cliente, datetime) "
                    "VALUES (%s, %s, %s, 1, %s, %s, %s)",
                    (payload.id_modulo, payload.source_id, uid, user_id, id_cliente_val, now),
                )
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()
