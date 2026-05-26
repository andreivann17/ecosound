from __future__ import annotations
from typing import Any, Dict, List, Optional
import datetime as dt
import re
import shutil
from pathlib import Path as FsPath
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel, ConfigDict
from ..deps import get_current_user, get_tenant_filter
from ..models import gastos as gastos_model
from ..models import audit as audit_model
from ..models import notificaciones as noti_model
from ..realtime.ws_manager import manager

router = APIRouter(prefix="/gastos", tags=["gastos"])

GASTOS_MODULO = 9
TIPO_CREACION = 1
TIPO_ACTUALIZACION = 2
TIPO_ELIMINACION = 3


def _log_audit_gasto(action: str, message: str, id_gasto: int, user_id: int, changes=None):
    try:
        audit_model.create_audit_log(data={
            "action": action,
            "message": message,
            "id_user": user_id,
            "id_modulo": GASTOS_MODULO,
            "id_key": str(id_gasto),
            "changes": changes,
        })
    except Exception:
        pass


async def _notify_gasto(tipo: int, descripcion: str, id_gasto: int, user_id: int, id_cliente: Optional[int] = None):
    try:
        _data = {
            "id_tipo_notificacion": tipo,
            "id_modulo": GASTOS_MODULO,
            "descripcion": descripcion,
            "id_user": user_id,
            "urgente": 0,
            "id_key": str(id_gasto),
        }
        if id_cliente:
            _data["id_cliente"] = id_cliente
        noti_model.create_notificacion(data=_data)
    except Exception:
        pass
    await manager.broadcast_json({
        "type": "NOTIFICACION_INVALIDATE",
        "source": "gastos",
        "id_gasto": id_gasto,
        "descripcion_notificacion": descripcion,
    })


def _send_correo_gasto(gasto: dict, accion: str) -> None:
    """Sends an email notification for a gasto if enabled and recipients exist."""
    try:
        from ..utils.email import send_email_bg, get_destinatarios_emails
        from ..db import get_connection

        # Check if correo_registrar_gasto is ON
        conn = get_connection()
        try:
            with conn.cursor(dictionary=True) as cur:
                cur.execute(
                    "SELECT correo_registrar_gasto FROM configuracion_gastos "
                    "WHERE active = 1 ORDER BY id_configuracion_gasto DESC LIMIT 1"
                )
                cfg = cur.fetchone()
        finally:
            conn.close()

        if not cfg or not cfg.get("correo_registrar_gasto"):
            return

        emails = get_destinatarios_emails(GASTOS_MODULO, 1)
        if not emails:
            return

        accion_label  = "registrado" if accion == "CREATE" else "actualizado"
        accion_color  = "#16a34a" if accion == "CREATE" else "#d97706"
        accion_badge  = "NUEVO" if accion == "CREATE" else "ACTUALIZADO"

        descripcion   = gasto.get("descripcion") or "—"
        monto         = gasto.get("monto") or 0
        monto_fmt     = f"${float(monto):,.2f}"
        fecha         = str(gasto.get("fecha") or "—")
        tipo          = gasto.get("nombre_tipo_gasto") or "Sin clasificar"
        notas         = gasto.get("notas") or "—"
        usuario       = gasto.get("nombre_usuario") or "Sistema"
        now           = dt.datetime.now().strftime("%d/%m/%Y %H:%M:%S")

        subject = f"Gasto {accion_label}: {descripcion}"

        html = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0"
           style="background:#ffffff;border-radius:16px;overflow:hidden;
                  box-shadow:0 4px 16px rgba(0,0,0,0.08);max-width:580px;">

      <!-- Header -->
      <tr>
        <td style="background:#01369e;padding:24px 32px;">
          <table width="100%"><tr>
            <td>
              <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">HerrSoft Events</div>
              <div style="font-size:12px;color:#93c5fd;margin-top:2px;">Sistema de gestión</div>
            </td>
            <td align="right">
              <span style="background:{accion_color};color:#fff;font-size:11px;font-weight:700;
                           letter-spacing:0.08em;padding:4px 12px;border-radius:20px;">
                {accion_badge}
              </span>
            </td>
          </tr></table>
        </td>
      </tr>

      <!-- Título -->
      <tr>
        <td style="padding:28px 32px 0;">
          <div style="font-size:20px;font-weight:700;color:#111827;">
            💸 Gasto {accion_label}
          </div>
          <div style="font-size:12px;color:#9ca3af;margin-top:6px;">
            Registrado el {now}
          </div>
        </td>
      </tr>

      <!-- Divider -->
      <tr><td style="padding:16px 32px 0;">
        <hr style="border:none;border-top:1px solid #f0f4f8;margin:0;">
      </td></tr>

      <!-- Monto destacado -->
      <tr>
        <td style="padding:20px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:#f0f6ff;border:1px solid #bfdbfe;border-radius:12px;">
            <tr>
              <td style="padding:18px 24px;">
                <div style="font-size:11px;color:#3b82f6;font-weight:700;
                             text-transform:uppercase;letter-spacing:0.06em;">Monto</div>
                <div style="font-size:32px;font-weight:800;color:#01369e;margin-top:4px;
                             letter-spacing:-1px;">{monto_fmt}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Detalles -->
      <tr>
        <td style="padding:0 32px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0">

            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f0f4f8;">
                <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;
                             letter-spacing:0.06em;margin-bottom:4px;">Descripción</div>
                <div style="font-size:15px;font-weight:600;color:#111827;">{descripcion}</div>
              </td>
            </tr>

            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f0f4f8;">
                <table width="100%"><tr>
                  <td width="50%" style="padding-right:12px;">
                    <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;
                                 letter-spacing:0.06em;margin-bottom:4px;">Fecha del gasto</div>
                    <div style="font-size:14px;font-weight:500;color:#374151;">📅 {fecha}</div>
                  </td>
                  <td width="50%">
                    <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;
                                 letter-spacing:0.06em;margin-bottom:4px;">Tipo de gasto</div>
                    <div style="font-size:14px;font-weight:500;color:#374151;">🏷️ {tipo}</div>
                  </td>
                </tr></table>
              </td>
            </tr>

            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f0f4f8;">
                <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;
                             letter-spacing:0.06em;margin-bottom:4px;">Notas</div>
                <div style="font-size:14px;color:#374151;">{notas}</div>
              </td>
            </tr>

            <tr>
              <td style="padding:12px 0;">
                <table width="100%"><tr>
                  <td width="50%" style="padding-right:12px;">
                    <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;
                                 letter-spacing:0.06em;margin-bottom:4px;">Registrado por</div>
                    <div style="font-size:14px;font-weight:600;color:#374151;">👤 {usuario}</div>
                  </td>
                  <td width="50%">
                    <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;
                                 letter-spacing:0.06em;margin-bottom:4px;">Hora del registro</div>
                    <div style="font-size:14px;font-weight:500;color:#374151;">🕐 {now}</div>
                  </td>
                </tr></table>
              </td>
            </tr>

          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f8fafc;border-top:1px solid #f0f4f8;padding:16px 32px;">
          <div style="font-size:11px;color:#9ca3af;text-align:center;">
            Este correo fue generado automáticamente por <strong>HerrSoft Events</strong> · Por favor no respondas a este mensaje.
          </div>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>"""

        send_email_bg(emails, subject, html)
    except Exception:
        pass


# ── Pydantic models ──────────────────────────────────────────────────────────

class GastoCreate(BaseModel):
    descripcion: str
    monto: float
    fecha: str
    id_tipo_gasto: Optional[int] = None
    notas: Optional[str] = None
    model_config = ConfigDict(extra="ignore")


class GastoUpdate(BaseModel):
    descripcion: Optional[str] = None
    monto: Optional[float] = None
    fecha: Optional[str] = None
    id_tipo_gasto: Optional[int] = None
    notas: Optional[str] = None
    active: Optional[bool] = None
    model_config = ConfigDict(extra="ignore")


class TipoGastoCreate(BaseModel):
    nombre: str
    model_config = ConfigDict(extra="ignore")


class GastosCorreoConfig(BaseModel):
    correo_registrar_gasto: bool = False
    model_config = ConfigDict(extra="ignore")


# ── Config: tabla configuracion_gastos ──────────────────────────────────────

_CFG_GASTOS_DDL = """
CREATE TABLE IF NOT EXISTS configuracion_gastos (
    id_configuracion_gasto  INT          AUTO_INCREMENT PRIMARY KEY,
    correo_registrar_gasto  TINYINT(1)   NOT NULL DEFAULT 0,
    id_user                 INT          NOT NULL DEFAULT 0,
    active                  TINYINT(1)   NOT NULL DEFAULT 1,
    datetime                DATETIME     NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
"""

_GASTOS_CORREO_DEFAULTS = {"correo_registrar_gasto": False}


def _ensure_cfg_gastos(conn):
    with conn.cursor() as cur:
        cur.execute(_CFG_GASTOS_DDL)
    conn.commit()


# ── Config: Tipos de gasto ──────────────────────────────────────────────────

@router.get("/config/tipos")
def list_tipos_gasto(
    _cu: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    return gastos_model.list_tipo_gastos(id_cliente=tenant_id)


@router.post("/config/tipos", status_code=201)
def create_tipo_gasto(
    payload: TipoGastoCreate,
    _cu: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    nombre = payload.nombre.strip()
    if not nombre:
        raise HTTPException(status_code=422, detail="El nombre es requerido.")
    try:
        return gastos_model.create_tipo_gasto(nombre=nombre, id_cliente=tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.delete("/config/tipos/{id_tipo_gasto}", status_code=200)
def delete_tipo_gasto(
    id_tipo_gasto: int,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    affected = gastos_model.delete_tipo_gasto(id_tipo_gasto)
    if affected == 0:
        raise HTTPException(status_code=404, detail="Tipo no encontrado.")
    return {"ok": True}


# ── Config: Correo ──────────────────────────────────────────────────────────

@router.get("/config/correo")
def get_config_correo_gastos(current_user: Dict[str, Any] = Depends(get_current_user)):
    from ..db import get_connection
    conn = get_connection()
    try:
        _ensure_cfg_gastos(conn)
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT correo_registrar_gasto FROM configuracion_gastos "
                "WHERE active = 1 ORDER BY id_configuracion_gasto DESC LIMIT 1"
            )
            row = cur.fetchone()
        if not row:
            return _GASTOS_CORREO_DEFAULTS
        return {k: bool(row[k]) for k in _GASTOS_CORREO_DEFAULTS}
    finally:
        conn.close()


@router.put("/config/correo", status_code=200)
def save_config_correo_gastos(
    payload: GastosCorreoConfig,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    from ..db import get_connection
    user_id = current_user.get("id")
    now = dt.datetime.now()
    conn = get_connection()
    try:
        _ensure_cfg_gastos(conn)
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id_configuracion_gasto FROM configuracion_gastos "
                "WHERE active = 1 ORDER BY id_configuracion_gasto DESC LIMIT 1"
            )
            existing = cur.fetchone()
            if existing:
                cur.execute(
                    "UPDATE configuracion_gastos SET correo_registrar_gasto = %s, datetime = %s "
                    "WHERE id_configuracion_gasto = %s",
                    (int(payload.correo_registrar_gasto), now, existing["id_configuracion_gasto"]),
                )
            else:
                cur.execute(
                    "INSERT INTO configuracion_gastos (correo_registrar_gasto, id_user, active, datetime) "
                    "VALUES (%s, %s, 1, %s)",
                    (int(payload.correo_registrar_gasto), user_id, now),
                )
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


# ── CRUD principal ───────────────────────────────────────────────────────────

@router.get("")
def list_gastos(
    search: Optional[str] = Query(None),
    id_tipo_gasto: Optional[int] = Query(None),
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    _cu: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    return gastos_model.list_gastos(
        search=search,
        id_tipo_gasto=id_tipo_gasto,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        id_cliente=tenant_id,
    )


@router.get("/resumen")
def get_resumen(
    _cu: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    return gastos_model.get_resumen_gastos(id_cliente=tenant_id)


@router.post("", status_code=201)
async def crear_gasto(
    payload: GastoCreate,
    cu: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    if not payload.descripcion.strip():
        raise HTTPException(status_code=422, detail="La descripción es requerida.")
    if payload.monto <= 0:
        raise HTTPException(status_code=422, detail="El monto debe ser mayor a 0.")

    result = gastos_model.create_gasto(
        data=payload.model_dump(),
        id_user=cu["id"],
        id_cliente=tenant_id,
    )
    id_gasto = result["id_gasto"]
    _log_audit_gasto("CREATE", f"Gasto registrado: {payload.descripcion}", id_gasto, cu["id"])
    await _notify_gasto(TIPO_CREACION, f"Nuevo gasto: {payload.descripcion}", id_gasto, cu["id"], id_cliente=tenant_id)
    gasto_completo = gastos_model.get_gasto_by_id(id_gasto)
    if gasto_completo:
        _send_correo_gasto(gasto_completo, "CREATE")
    return result


@router.post("/{id_gasto}/documento", status_code=200)
async def upload_documento_gasto(
    id_gasto: int,
    file: UploadFile = File(...),
    cu: Dict[str, Any] = Depends(get_current_user),
):
    gasto = gastos_model.get_gasto_by_id(id_gasto)
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado.")

    id_cliente = gasto.get("id_cliente") or 0
    dest_dir = FsPath("uploads") / str(id_cliente) / "gastos" / str(id_gasto)
    dest_dir.mkdir(parents=True, exist_ok=True)

    original_filename = file.filename or "archivo"
    safe_name = re.sub(r"[^\w.\-]", "_", original_filename)
    timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    stored_name = f"{timestamp}_{safe_name}"
    dest_path = dest_dir / stored_name

    # Remove previous file if one exists
    old_path = gasto.get("path")
    if old_path:
        try:
            FsPath(old_path).unlink(missing_ok=True)
        except Exception:
            pass

    with dest_path.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)

    from ..utils.comprimir import compress_file_best_effort
    dest_path = compress_file_best_effort(dest_path)
    rel_path = str(dest_path).replace("\\", "/")

    gastos_model.update_gasto(id_gasto, {"filename": original_filename, "path": rel_path})
    _log_audit_gasto("DOCUMENTO_ADD", f"Documento adjunto: {original_filename}", id_gasto, cu["id"])
    return {"filename": original_filename, "path": rel_path}


@router.delete("/{id_gasto}/documento", status_code=200)
async def delete_documento_gasto(
    id_gasto: int,
    cu: Dict[str, Any] = Depends(get_current_user),
):
    gasto = gastos_model.get_gasto_by_id(id_gasto)
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado.")

    old_path = gasto.get("path")
    if old_path:
        try:
            FsPath(old_path).unlink(missing_ok=True)
        except Exception:
            pass

    gastos_model.update_gasto(id_gasto, {"filename": None, "path": None})
    _log_audit_gasto("DOCUMENTO_DEL", "Documento eliminado", id_gasto, cu["id"])
    return {"ok": True}


@router.get("/{id_gasto}")
def get_gasto(
    id_gasto: int,
    _cu: Dict[str, Any] = Depends(get_current_user),
):
    gasto = gastos_model.get_gasto_by_id(id_gasto)
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado.")
    return gasto


@router.patch("/{id_gasto}")
async def actualizar_gasto(
    id_gasto: int,
    payload: GastoUpdate,
    cu: Dict[str, Any] = Depends(get_current_user),
):
    gasto = gastos_model.get_gasto_by_id(id_gasto)
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado.")

    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    affected = gastos_model.update_gasto(id_gasto, data)
    if affected == 0:
        raise HTTPException(status_code=400, detail="Sin cambios para aplicar.")

    _log_audit_gasto("UPDATE", f"Gasto actualizado: {gasto['descripcion']}", id_gasto, cu["id"], changes=data)
    await _notify_gasto(TIPO_ACTUALIZACION, f"Gasto actualizado: {gasto['descripcion']}", id_gasto, cu["id"], id_cliente=gasto.get("id_cliente"))
    gasto_actualizado = gastos_model.get_gasto_by_id(id_gasto)
    if gasto_actualizado:
        _send_correo_gasto(gasto_actualizado, "UPDATE")
    return {"ok": True}


@router.delete("/{id_gasto}")
async def eliminar_gasto(
    id_gasto: int,
    cu: Dict[str, Any] = Depends(get_current_user),
):
    gasto = gastos_model.get_gasto_by_id(id_gasto)
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado.")

    gastos_model.delete_gasto(id_gasto)
    _log_audit_gasto("DELETE", f"Gasto eliminado: {gasto['descripcion']}", id_gasto, cu["id"])
    await _notify_gasto(TIPO_ELIMINACION, f"Gasto eliminado: {gasto['descripcion']}", id_gasto, cu["id"], id_cliente=gasto.get("id_cliente"))
    return {"ok": True}
