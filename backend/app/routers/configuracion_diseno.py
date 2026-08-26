from fastapi import APIRouter, Depends
from pydantic import BaseModel
from ..deps import get_current_user
from ..db import get_connection

router = APIRouter(prefix="/configuracion-diseno", tags=["Configuracion Diseno"])


class ConfigDisenoBody(BaseModel):
    is_vertical: int


@router.get("/me")
def get_config_diseno(current_user=Depends(get_current_user)):
    id_user = int(current_user["id"])
    with get_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM configuracion_diseno WHERE id_user = %s AND active = 1 ORDER BY datetime DESC LIMIT 1",
            (id_user,),
        )
        row = cursor.fetchone()
        if not row:
            return {"is_vertical": 0, "id_configuracion_diseno": None}
        return row


@router.post("/me")
def upsert_config_diseno(body: ConfigDisenoBody, current_user=Depends(get_current_user)):
    id_user = int(current_user["id"])
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE configuracion_diseno SET active = 0 WHERE id_user = %s",
            (id_user,),
        )
        cursor.execute(
            "INSERT INTO configuracion_diseno (is_vertical, id_user, active, datetime) VALUES (%s, %s, 1, NOW())",
            (body.is_vertical, id_user),
        )
    return {"is_vertical": body.is_vertical}
