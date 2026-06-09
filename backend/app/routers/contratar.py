"""
Suscripciones / Contratación de planes con Stripe.

Flujo:
- El frontend (página /contratar) envía POST a /contratar/payment-intent con
  los datos del cliente y el plan elegido.
- Aquí creamos un Customer en Stripe y una Subscription incompleta,
  con payment_behavior="default_incomplete". Stripe genera un Invoice con
  un PaymentIntent asociado.
- Devolvemos el client_secret de ese PaymentIntent. El frontend lo usa con
  Stripe Elements (PaymentElement) para confirmar el pago.
- Cuando el pago se completa, Stripe envía un webhook que el backend puede
  procesar para activar la cuenta del cliente en la BD (NO incluido aquí —
  agregar /contratar/webhook cuando se necesite).

Variables de entorno requeridas:
- STRIPE_SECRET_KEY  → Secret key del API de Stripe (sk_test_... o sk_live_...)
- STRIPE_PRICE_ID    → Price ID del plan mensual creado en Stripe Dashboard
"""
from __future__ import annotations
from typing import Optional
import os
import datetime as dt
import secrets

from pathlib import Path as FsPath

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr

from ..deps import get_tenant_filter

# Carpeta raíz del backend (backend/)
_BACKEND_DIR = FsPath(__file__).resolve().parent.parent.parent
_INSTALLER_ZIP = _BACKEND_DIR / "release - herrsoft.zip"

try:
    import stripe  # type: ignore
except ImportError:
    stripe = None  # type: ignore

router = APIRouter(prefix="/contratar", tags=["contratar"])

# Códigos de verificación de correo en memoria: {email: {"code": str, "expires": datetime}}
_email_codes: dict = {}

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")

STRIPE_PRICE_IDS = {
    "herrsoft_events_mensual": os.getenv("STRIPE_PRICE_ID_MENSUAL", "price_1TceGZAXPQeLqw7KYYlHCbs1"),
    "herrsoft_events_anual":   os.getenv("STRIPE_PRICE_ID_ANUAL",   "price_1TezP1AXPQeLqw7KnN5jyctF"),
}

if stripe is not None and STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

TRIAL_ENABLED = True  # cambiar a True para activar periodos de prueba en producción


# ─── CÁLCULO DE FECHAS DE COBRO ─────────────────────────────────────────────

def _next_billing_from(base: dt.date) -> dt.date:
    """Dado un día base, devuelve el próximo día de cobro (día 2 ó 16)."""
    if base.day <= 15:
        return base.replace(day=16)
    # día > 15 → día 2 del mes siguiente
    if base.month == 12:
        return dt.date(base.year + 1, 1, 2)
    return dt.date(base.year, base.month + 1, 2)


def _add_months(d: dt.date, months: int) -> dt.date:
    """Suma meses a una fecha sin desbordamiento de días."""
    import calendar
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return d.replace(year=year, month=month, day=day)


def _calc_trial_end(plan: str) -> dt.date:
    """
    Mensual  → 1 mes de prueba  → próxima fecha de cobro (día 2/16) después de +1 mes
    Anual    → 2 meses de prueba → próxima fecha de cobro (día 2/16) después de +2 meses
    """
    today = dt.date.today()
    months = 2 if "anual" in (plan or "").lower() else 1
    return _next_billing_from(_add_months(today, months))


class PaymentIntentPayload(BaseModel):
    plan: str
    email: EmailStr
    nombre: str
    empresa: Optional[str] = ""


def _extract_client_secret(invoice) -> Optional[str]:
    """
    El campo donde Stripe pone el client_secret cambia según la versión del API:
    - API nueva: invoice.confirmation_secret.client_secret
    - API anterior: invoice.payment_intent.client_secret (expandido)
    - Fallback: stripe.PaymentIntent.retrieve(invoice.payment_intent_id).client_secret
    """
    if invoice is None:
        return None

    cs_obj = getattr(invoice, "confirmation_secret", None)
    if cs_obj is not None:
        secret = getattr(cs_obj, "client_secret", None)
        if secret:
            return secret

    pi_attr = getattr(invoice, "payment_intent", None)
    if pi_attr is not None:
        # Caso A: el invoice trae el PaymentIntent expandido como objeto
        if not isinstance(pi_attr, str):
            secret = getattr(pi_attr, "client_secret", None)
            if secret:
                return secret
            pi_id = getattr(pi_attr, "id", None)
        else:
            pi_id = pi_attr
        # Caso B: solo trae el ID string — recuperamos el PaymentIntent por separado
        if pi_id and stripe is not None:
            try:
                pi = stripe.PaymentIntent.retrieve(pi_id)
                secret = getattr(pi, "client_secret", None)
                if secret:
                    return secret
            except Exception:
                pass

    return None


@router.post("/payment-intent")
def create_payment_intent(payload: PaymentIntentPayload, request: Request):
    if stripe is None:
        raise HTTPException(
            status_code=500,
            detail="El SDK de Stripe no está instalado en el servidor.",
        )
    if not STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=500,
            detail="Stripe no está configurado (falta STRIPE_SECRET_KEY).",
        )

    price_id = STRIPE_PRICE_IDS.get(payload.plan) or STRIPE_PRICE_IDS.get("herrsoft_events_mensual")
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Plan no reconocido: {payload.plan}")

    if not payload.nombre.strip():
        raise HTTPException(status_code=422, detail="El nombre es requerido.")

    ip = request.client.host if request.client else ""

    try:
        customer = stripe.Customer.create(
            email=str(payload.email),
            name=payload.nombre.strip(),
            metadata={
                "empresa": (payload.empresa or "").strip(),
                "plan_solicitado": payload.plan,
                "origen": "web/contratar",
                "ip": ip,
            },
        )

        trial_end_date = _calc_trial_end(payload.plan)
        trial_end_ts = int(dt.datetime.combine(trial_end_date, dt.time.min).timestamp())

        sub_params: dict = {
            "customer": customer.id,
            "items": [{"price": price_id}],
            "payment_behavior": "default_incomplete",
            "payment_settings": {
                "save_default_payment_method": "on_subscription",
                "payment_method_types": ["card"],
            },
            "expand": [
                "pending_setup_intent",
                "latest_invoice.confirmation_secret",
                "latest_invoice.payment_intent",
            ],
        }
        if TRIAL_ENABLED:
            sub_params["trial_end"] = trial_end_ts

        subscription = stripe.Subscription.create(**sub_params)

        # Con trial, Stripe crea un SetupIntent (no PaymentIntent) porque el monto es $0
        if subscription.status == "trialing":
            si = subscription.pending_setup_intent
            if si is None:
                # Crear uno explícito si Stripe no lo generó automáticamente
                si = stripe.SetupIntent.create(
                    customer=customer.id,
                    payment_method_types=["card"],
                    usage="off_session",
                    metadata={"subscription_id": subscription.id},
                )
            client_secret = si.client_secret if not isinstance(si, str) else stripe.SetupIntent.retrieve(si).client_secret
            return {
                "clientSecret": client_secret,
                "subscriptionId": subscription.id,
                "customerId": customer.id,
                "intentType": "setup",
                "trialEnd": trial_end_date.isoformat(),
            }

        # Sin trial: flujo normal con PaymentIntent
        invoice = subscription.latest_invoice
        client_secret = _extract_client_secret(invoice)

        if not client_secret and invoice is not None:
            invoice_id = getattr(invoice, "id", None)
            if invoice_id:
                fresh_invoice = stripe.Invoice.retrieve(
                    invoice_id,
                    expand=["confirmation_secret", "payment_intent"],
                )
                client_secret = _extract_client_secret(fresh_invoice)

        if not client_secret:
            raise HTTPException(
                status_code=500,
                detail=(
                    "No se pudo obtener el clientSecret del invoice de Stripe. "
                    f"sub.status={getattr(subscription, 'status', '?')} "
                    f"invoice_id={getattr(invoice, 'id', '?') if invoice else '?'}"
                ),
            )

        return {
            "clientSecret": client_secret,
            "subscriptionId": subscription.id,
            "customerId": customer.id,
            "intentType": "payment",
            "trialEnd": None,
        }

    except stripe.error.StripeError as e:
        msg = getattr(e, "user_message", None) or str(e)
        raise HTTPException(status_code=400, detail=msg)


# ─── DESCARGA DE LA APP ─────────────────────────────────────────────────────

@router.get("/descargar-app")
def descargar_app():
    """Sirve el instalador de la app de escritorio como descarga directa."""
    if not _INSTALLER_ZIP.exists():
        raise HTTPException(status_code=404, detail="Instalador no disponible en este momento.")
    return FileResponse(
        path=str(_INSTALLER_ZIP),
        media_type="application/zip",
        filename="herrsoft-events.zip",
    )


# ─── PROVISIONAMIENTO DE CUENTA ─────────────────────────────────────────────

ADMIN_EMAILS = ["andreivann17@gmail.com", "grupoeco.slrc@gmail.com"]
LOGIN_URL = "https://herrsoft.com/app/login"
ID_APP = 1  # id_app de Herrsoft Events en la tabla apps

_MESES_ES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]


def _fecha_larga_es(fecha: "dt.datetime") -> str:
    """Formatea una fecha como '16 de junio de 2026', sin depender del locale del sistema."""
    return f"{fecha.day} de {_MESES_ES[fecha.month - 1]} de {fecha.year}"


# ─── PORTAL DE FACTURACIÓN (Stripe Customer Portal) ─────────────────────────
# Permite al cliente cambiar/quitar su tarjeta, ver su historial de pagos y
# cancelar su suscripción desde una página hospedada por Stripe — sin tener
# que construir esa UI nosotros. El webhook ya reacciona a los cambios que
# resulten (customer.subscription.updated/deleted).

@router.post("/portal-session")
def create_portal_session(request: Request, id_cliente: Optional[int] = Depends(get_tenant_filter)):
    if stripe is None or not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe no está configurado.")
    if not id_cliente:
        raise HTTPException(status_code=403, detail="Esta cuenta no está asociada a un cliente.")

    from ..models.clientes import get_cliente_by_id
    cliente = get_cliente_by_id(ID_APP, id_cliente)
    customer_id = (cliente or {}).get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="Esta cuenta no tiene una suscripción de pago asociada.")

    origin = request.headers.get("origin") or str(request.base_url).rstrip("/")
    return_url = f"{origin}/app/mi-cuenta"

    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
    except stripe.error.StripeError as e:
        msg = getattr(e, "user_message", None) or str(e)
        raise HTTPException(status_code=400, detail=msg)

    return {"url": session.url}


@router.get("/mi-cuenta")
def get_mi_cuenta(id_cliente: Optional[int] = Depends(get_tenant_filter)):
    """Datos del cliente autenticado para la página 'Mi cuenta' (plan, próximo pago, etc.)."""
    if not id_cliente:
        raise HTTPException(status_code=403, detail="Esta cuenta no está asociada a un cliente.")

    from ..models.clientes import get_cliente_by_id
    cliente = get_cliente_by_id(ID_APP, id_cliente)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")

    nombre = f"{cliente.get('nombre_cliente','')} {cliente.get('apellido_cliente','')}".strip()
    return {
        "nombre": nombre,
        "email": cliente.get("correo"),
        "plan": cliente.get("tipo_subscripcion"),
        "fecha_proxima_pago": cliente.get("fecha_proxima_pago"),
        "fecha_fin_prueba": cliente.get("fecha_fin_prueba"),
        "habilitar_sistema": bool(cliente.get("habilitar_sistema")),
        "tiene_metodo_pago": bool(cliente.get("stripe_customer_id")),
    }


@router.get("/mis-pagos")
def get_mis_pagos(id_cliente: Optional[int] = Depends(get_tenant_filter)):
    """Historial de pagos (clientes_pagos) del cliente autenticado."""
    if not id_cliente:
        raise HTTPException(status_code=403, detail="Esta cuenta no está asociada a un cliente.")

    from ..models.clientes import list_pagos
    return list_pagos(id_app=ID_APP, id_cliente=id_cliente)


# ─── VINCULAR TARJETA (clientes en efectivo → pago con tarjeta) ─────────────


class VincularIniciarPayload(BaseModel):
    plan: str = "herrsoft_events_mensual"


class VincularConfirmarPayload(BaseModel):
    setup_intent_id: str
    plan: str = "herrsoft_events_mensual"


def _link_stripe_customer_id(id_cliente: int, customer_id: str) -> None:
    from ..db import get_admin_connection as _adm
    conn = _adm()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE clientes SET stripe_customer_id=%s WHERE id_cliente=%s",
                (customer_id, id_cliente),
            )
        conn.commit()
    except Exception as e:
        print(f"[vincular] _link_stripe_customer_id error: {e}", flush=True)
    finally:
        conn.close()


def _link_stripe_subscription_data(
    id_cliente: int,
    sub_id: str,
    customer_id: str,
    pm_id: Optional[str],
    price_id: Optional[str],
    tipo_sub: str,
    fecha_proxima_pago: str,
    estado: str,
) -> None:
    from ..db import get_admin_connection as _adm
    conn = _adm()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE clientes SET
                       stripe_customer_id=%s,
                       stripe_subscription_id=%s,
                       stripe_payment_method_id=%s,
                       stripe_price_id=%s,
                       suscripcion_estado=%s
                   WHERE id_cliente=%s""",
                (customer_id, sub_id, pm_id, price_id, estado, id_cliente),
            )
            cur.execute(
                """UPDATE apps_clientes SET
                       tipo_subscripcion=%s,
                       fecha_proxima_pago=%s
                   WHERE id_cliente=%s AND id_app=%s""",
                (tipo_sub, fecha_proxima_pago, id_cliente, ID_APP),
            )
        conn.commit()
    except Exception as e:
        print(f"[vincular] _link_stripe_subscription_data error: {e}", flush=True)
    finally:
        conn.close()


@router.post("/vincular-tarjeta/iniciar")
def vincular_tarjeta_iniciar(
    payload: VincularIniciarPayload,
    id_cliente: Optional[int] = Depends(get_tenant_filter),
):
    """
    Paso 1 — vinculación de tarjeta para clientes en efectivo.

    Crea un Customer en Stripe (si no existe) y un SetupIntent.
    El frontend usa clientSecret con Stripe Elements para capturar la tarjeta.
    No se cobra nada en este paso.

    Respuesta: {clientSecret, setupIntentId, customerId}
    """
    if stripe is None or not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe no está configurado.")
    if not id_cliente:
        raise HTTPException(status_code=403, detail="Esta cuenta no está asociada a un cliente.")

    from ..models.clientes import get_cliente_by_id
    cliente = get_cliente_by_id(ID_APP, id_cliente)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")

    price_id = STRIPE_PRICE_IDS.get(payload.plan)
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Plan no reconocido: {payload.plan}")

    if (
        cliente.get("stripe_subscription_id")
        and cliente.get("suscripcion_estado") in ("active", "trialing")
    ):
        raise HTTPException(
            status_code=400,
            detail="Esta cuenta ya tiene una suscripción activa con tarjeta.",
        )

    nombre = f"{cliente.get('nombre_cliente', '')} {cliente.get('apellido_cliente', '')}".strip()
    correo = (cliente.get("correo") or "").strip()

    try:
        customer_id = cliente.get("stripe_customer_id") or None
        if not customer_id:
            customer = stripe.Customer.create(
                email=correo,
                name=nombre,
                metadata={
                    "id_cliente": str(id_cliente),
                    "origen": "vincular_tarjeta",
                },
            )
            customer_id = customer.id
            _link_stripe_customer_id(id_cliente, customer_id)

        si = stripe.SetupIntent.create(
            customer=customer_id,
            payment_method_types=["card"],
            usage="off_session",
            metadata={
                "id_cliente": str(id_cliente),
                "plan": payload.plan,
            },
        )

        return {
            "clientSecret": si.client_secret,
            "setupIntentId": si.id,
            "customerId": customer_id,
        }

    except stripe.error.StripeError as e:
        msg = getattr(e, "user_message", None) or str(e)
        raise HTTPException(status_code=400, detail=msg)


@router.post("/vincular-tarjeta/confirmar")
def vincular_tarjeta_confirmar(
    payload: VincularConfirmarPayload,
    id_cliente: Optional[int] = Depends(get_tenant_filter),
):
    """
    Paso 2 — vinculación de tarjeta para clientes en efectivo.

    Se llama DESPUÉS de que Stripe Elements confirma el SetupIntent en el frontend.
    Crea la Subscription y cobra el primer período con la tarjeta guardada.
    La BD se actualiza con stripe_subscription_id, stripe_payment_method_id, etc.
    El webhook invoice.payment_succeeded actualiza el estado a "active" al confirmarse el cobro.

    Respuesta: {ok, subscriptionId, status, fechaProximoPago}
    """
    if stripe is None or not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe no está configurado.")
    if not id_cliente:
        raise HTTPException(status_code=403, detail="Esta cuenta no está asociada a un cliente.")

    from ..models.clientes import get_cliente_by_id
    cliente = get_cliente_by_id(ID_APP, id_cliente)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")

    price_id = STRIPE_PRICE_IDS.get(payload.plan)
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Plan no reconocido: {payload.plan}")

    customer_id = cliente.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(
            status_code=400,
            detail="No se encontró el Customer de Stripe. Reinicia el proceso.",
        )

    try:
        si = stripe.SetupIntent.retrieve(payload.setup_intent_id)
        if si.status != "succeeded":
            raise HTTPException(
                status_code=400,
                detail=f"El SetupIntent no fue confirmado por Stripe (estado: {si.status}).",
            )

        pm_id = si.payment_method
        if pm_id and not isinstance(pm_id, str):
            pm_id = getattr(pm_id, "id", None)
        if not pm_id:
            raise HTTPException(status_code=400, detail="No se obtuvo el método de pago del SetupIntent.")

        # Establecer tarjeta como método por defecto del Customer
        stripe.Customer.modify(customer_id, invoice_settings={"default_payment_method": pm_id})

        # Crear la Subscription — cobra de inmediato con la tarjeta guardada
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id}],
            default_payment_method=pm_id,
            expand=["latest_invoice.payment_intent"],
            metadata={
                "id_cliente": str(id_cliente),
                "origen": "vincular_tarjeta",
            },
        )

        sub_id = subscription.id
        estado = getattr(subscription, "status", "active") or "active"

        # Calcular fecha_proxima_pago desde current_period_end de Stripe
        cp_end_ts = getattr(subscription, "current_period_end", None)
        if cp_end_ts is None:
            items = getattr(subscription, "items", None)
            items_data = getattr(items, "data", []) if items else []
            if items_data:
                cp_end_ts = getattr(items_data[0], "current_period_end", None)

        try:
            fecha_proxima_pago = dt.datetime.fromtimestamp(int(cp_end_ts)).date().isoformat() if cp_end_ts else None
        except Exception:
            fecha_proxima_pago = None
        if not fecha_proxima_pago:
            fecha_proxima_pago = _calc_trial_end(payload.plan).isoformat()

        tipo_sub = "anual" if "anual" in (payload.plan or "") else "mensual"

        _link_stripe_subscription_data(
            id_cliente=id_cliente,
            sub_id=sub_id,
            customer_id=customer_id,
            pm_id=pm_id,
            price_id=price_id,
            tipo_sub=tipo_sub,
            fecha_proxima_pago=fecha_proxima_pago,
            estado=estado,
        )

        return {
            "ok": True,
            "subscriptionId": sub_id,
            "status": estado,
            "fechaProximoPago": fecha_proxima_pago,
        }

    except stripe.error.StripeError as e:
        msg = getattr(e, "user_message", None) or str(e)
        raise HTTPException(status_code=400, detail=msg)


@router.post("/solicitar-eliminar-cuenta")
async def solicitar_eliminar_cuenta(id_cliente: Optional[int] = Depends(get_tenant_filter)):
    """Desactiva la cuenta del cliente (habilitar_sistema=0, users.active=0) y envía correo."""
    if not id_cliente:
        raise HTTPException(status_code=403, detail="Esta cuenta no está asociada a un cliente.")

    from ..models.clientes import get_cliente_by_id
    from ..utils.email import send_email_bg
    from ..db import get_admin_connection as _adm, get_connection as _eco

    cliente = get_cliente_by_id(ID_APP, id_cliente)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")

    correo = (cliente.get("correo") or "").strip()
    nombre = f"{cliente.get('nombre_cliente', '')} {cliente.get('apellido_cliente', '')}".strip()

    # 1. Desactivar en BD administrador (apps_clientes + estado cliente)
    try:
        conn = _adm()
        cur = conn.cursor()
        cur.execute(
            "UPDATE apps_clientes SET habilitar_sistema=0 WHERE id_app=1 AND id_cliente=%s",
            (id_cliente,),
        )
        cur.execute(
            "UPDATE clientes SET suscripcion_estado='canceled' WHERE id_cliente=%s",
            (id_cliente,),
        )
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[eliminar-cuenta] ERROR admin DB id_cliente={id_cliente}: {e}")
        raise HTTPException(status_code=500, detail=f"Error al desactivar cuenta (admin): {e}")

    # 2. Desactivar todos los usuarios en BD ecosound
    try:
        ec = _eco()
        cur2 = ec.cursor()
        cur2.execute(
            "UPDATE users SET active=0 WHERE id_cliente=%s",
            (id_cliente,),
        )
        cur2.close()
        ec.close()
    except Exception as e:
        print(f"[eliminar-cuenta] ERROR ecosound DB id_cliente={id_cliente}: {e}")
        raise HTTPException(status_code=500, detail=f"Error al desactivar usuarios: {e}")

    html = f"""<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08);max-width:560px;">
      <tr><td style="background:#1f2937;padding:24px 32px;">
        <div style="font-size:20px;font-weight:700;color:#fff;">HerrSoft Events</div>
        <div style="font-size:12px;color:#d1d5db;margin-top:2px;">Confirmación de eliminación de cuenta</div>
      </td></tr>
      <tr><td style="padding:28px 32px;">
        <p style="font-size:15px;color:#111827;margin:0 0 16px 0;">
          Hola <strong>{nombre or correo}</strong>,
        </p>
        <p style="font-size:14px;color:#374151;margin:0 0 16px 0;">
          Te confirmamos que tu cuenta de <strong>HerrSoft Events</strong> ha sido eliminada
          correctamente, tal como lo solicitaste.
        </p>
        <p style="font-size:14px;color:#374151;margin:0 0 16px 0;">
          Si deseas mantener o reactivar tu suscripción, o crees que esto fue un error,
          comunícate con nuestro equipo de soporte lo antes posible:
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
          <tr><td style="background:#f3f4f6;border-radius:8px;padding:14px 20px;">
            <div style="font-size:13px;color:#6b7280;margin-bottom:4px;">Correo de soporte</div>
            <a href="mailto:soporte.herrsoft@gmail.com"
               style="font-size:15px;font-weight:600;color:#1d4ed8;text-decoration:none;">
              soporte.herrsoft@gmail.com
            </a>
          </td></tr>
        </table>
        <p style="font-size:14px;color:#374151;margin:0 0 8px 0;">
          Ha sido un placer tenerte con nosotros. Esperamos poder servirte de nuevo en el futuro.
        </p>
        <p style="font-size:14px;color:#374151;margin:0;">
          ¡Muchas gracias por haber sido parte de <strong>HerrSoft</strong>! 💙
        </p>
      </td></tr>
      <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
        <p style="font-size:12px;color:#9ca3af;margin:0;">
          HerrSoft · Este correo fue enviado automáticamente, por favor no respondas directamente.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>"""

    try:
        destinatarios, vistos = [], set()
        for e in ([correo] if correo else []) + ADMIN_EMAILS:
            e_n = e.strip().lower()
            if e_n and e_n not in vistos:
                vistos.add(e_n)
                destinatarios.append(e)
        if destinatarios:
            send_email_bg(destinatarios, f"Tu cuenta de HerrSoft ha sido eliminada", html)
    except Exception:
        pass

    # Expulsar todas las sesiones activas del cliente vía WS
    try:
        from ..realtime.ws_manager import manager
        await manager.broadcast_json({"type": "CUENTA_ELIMINADA", "id_cliente": id_cliente})
    except Exception:
        pass

    return {"ok": True}


class ProvisionPayload(BaseModel):
    nombre: str
    apellido: Optional[str] = ""
    email: EmailStr
    empresa: Optional[str] = ""
    password: str
    marketing: bool = False
    plan: Optional[str] = "herrsoft_events_mensual"
    fecha_proxima_pago: Optional[str] = None
    stripe_subscription_id:  Optional[str] = None
    stripe_customer_id:      Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
    stripe_payment_method_id: Optional[str] = None


def _build_verification_email(nombre: str, code: str) -> str:
    now_str = dt.datetime.now().strftime("%d/%m/%Y %H:%M")
    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:16px;overflow:hidden;
                  box-shadow:0 4px 16px rgba(0,0,0,0.08);max-width:580px;">
      <tr>
        <td style="background:#012770;padding:24px 32px;">
          <div style="font-size:22px;font-weight:700;color:#fff;">HerrSoft Events</div>
          <div style="font-size:12px;color:#93c5fd;margin-top:2px;">Verificación de correo</div>
        </td>
      </tr>
      <tr>
        <td style="background:#eff6ff;border-bottom:2px solid #bfdbfe;padding:14px 32px;">
          <div style="font-size:15px;font-weight:700;color:#012770;">🔐 Código de verificación</div>
          <div style="font-size:12px;color:#3b82f6;margin-top:2px;">Enviado el {now_str}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px;text-align:center;">
          <p style="font-size:15px;color:#111827;margin:0 0 24px 0;">
            Hola <strong>{nombre}</strong>, ingresa el siguiente código para verificar tu correo
            electrónico y continuar con el registro.
          </p>
          <div style="background:#f0f7ff;border:2px solid #bfdbfe;border-radius:12px;
                      padding:22px 48px;display:inline-block;margin:0 auto 24px auto;">
            <div style="font-size:44px;font-weight:800;letter-spacing:14px;color:#012770;
                        font-family:monospace;">{code}</div>
          </div>
          <p style="font-size:13px;color:#6b7280;margin:0 0 4px 0;">
            Este código expira en <strong>10 minutos</strong>.
          </p>
          <p style="font-size:13px;color:#6b7280;margin:0;">
            Si no solicitaste este código, puedes ignorar este mensaje.
          </p>
        </td>
      </tr>
      <tr>
        <td style="background:#f8fafc;border-top:1px solid #f0f4f8;padding:16px 32px;">
          <div style="font-size:11px;color:#9ca3af;text-align:center;">
            HerrSoft Events · <a href="mailto:soporte.herrsoft@gmail.com"
              style="color:#9ca3af;">soporte.herrsoft@gmail.com</a>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""


class EnviarCodigoPayload(BaseModel):
    email: EmailStr
    nombre: Optional[str] = ""


class VerificarCodigoPayload(BaseModel):
    email: EmailStr
    codigo: str


@router.post("/enviar-codigo-verificacion")
def enviar_codigo_verificacion(payload: EnviarCodigoPayload):
    """Genera un código de 6 dígitos, lo guarda en memoria y lo envía al correo del usuario."""
    from ..utils.email import send_email_bg

    email_clean = str(payload.email).strip().lower()
    code = f"{secrets.randbelow(1000000):06d}"
    _email_codes[email_clean] = {
        "code": code,
        "expires": dt.datetime.now() + dt.timedelta(minutes=10),
    }
    nombre = (payload.nombre or "").strip() or "Usuario"
    html = _build_verification_email(nombre, code)
    send_email_bg([email_clean], "Tu código de verificación — Herrsoft Events", html)
    return {"ok": True}


@router.post("/verificar-codigo")
def verificar_codigo(payload: VerificarCodigoPayload):
    """Valida el código enviado al correo. Lanza 400 si es incorrecto o expiró."""
    email_clean = str(payload.email).strip().lower()
    stored = _email_codes.get(email_clean)
    if not stored:
        raise HTTPException(status_code=400, detail="No hay un código activo para este correo. Solicita uno nuevo.")
    if dt.datetime.now() > stored["expires"]:
        _email_codes.pop(email_clean, None)
        raise HTTPException(status_code=400, detail="El código ha expirado. Solicita uno nuevo.")
    if payload.codigo.strip() != stored["code"]:
        raise HTTPException(status_code=400, detail="Código incorrecto. Inténtalo de nuevo.")
    _email_codes.pop(email_clean, None)
    return {"ok": True}


@router.get("/check-email")
def check_email_availability(email: str = Query(...)):
    """Devuelve si el correo está disponible para registrarse."""
    from ..models.clientes import check_email_available_for_cliente

    email_clean = email.strip().lower()

    error = check_email_available_for_cliente(email_clean)
    if error:
        return {"available": False, "reason": error}

    return {"available": True, "reason": None}


class Paso1Payload(BaseModel):
    nombre: str
    apellido: Optional[str] = ""
    email: EmailStr
    empresa: Optional[str] = ""
    password: str
    marketing: bool = False


@router.post("/guardar-paso1")
def guardar_paso1(payload: Paso1Payload):
    """Guarda el intento de registro (paso 1) en administrador.registros_incompletos."""
    from ..db import get_admin_connection
    from ..models.clientes import _hash_password

    email_clean = str(payload.email).strip().lower()
    hashed = _hash_password(payload.password)

    try:
        conn = get_admin_connection()
        try:
            with conn.cursor() as cur:
                # Desactivar registros anteriores del mismo correo
                cur.execute(
                    "UPDATE registros_incompletos SET active = 0 WHERE correo = %s",
                    (email_clean,),
                )
                # Insertar nuevo registro con todos los datos
                cur.execute(
                    """INSERT INTO registros_incompletos
                           (correo, nombre, apellido, empresa, datetime, password, active, enviar_correo)
                       VALUES (%s, %s, %s, %s, NOW(), %s, 1, %s)""",
                    (
                        email_clean,
                        payload.nombre.strip(),
                        (payload.apellido or "").strip(),
                        (payload.empresa or "").strip(),
                        hashed,
                        1 if payload.marketing else 0,
                    ),
                )
            conn.commit()
        finally:
            conn.close()
    except Exception:
        pass  # No bloquear al usuario si esto falla

    return {"ok": True}




_PLAN_LABELS = {
    "herrsoft_events_mensual": ("Plan Mensual", "$550 MXN / mes"),
    "herrsoft_events_anual":   ("Plan Anual",   "$5,500 MXN / año"),
}


_PLAN_TRIAL = {
    "herrsoft_events_mensual": ("🎁", "1 mes gratis al contratar", "Tu primer cobro se realizará en 30 días. Hoy no se te cobra nada."),
    "herrsoft_events_anual":   ("🎉", "2 meses gratis incluidos", "Pagaste un año completo y te ahorraste $1,100 MXN, el equivalente a 2 meses sin costo frente al plan mensual."),
}


def _build_welcome_html(nombre: str, email: str, password: str = "",  # noqa: ARG001
                        plan: str = "herrsoft_events_mensual",
                        download_url: str = "") -> str:
    now_str = dt.datetime.now().strftime("%d/%m/%Y %H:%M")
    plan_nombre, plan_precio = _PLAN_LABELS.get(plan, ("Plan Mensual", "$550 MXN / mes"))
    trial_icon, trial_title, trial_desc = _PLAN_TRIAL.get(plan, _PLAN_TRIAL["herrsoft_events_mensual"])
    dl_url = download_url or "https://herrsoft.com/api/contratar/descargar-app"
    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:16px;overflow:hidden;
                  box-shadow:0 4px 16px rgba(0,0,0,0.08);max-width:580px;">
      <tr>
        <td style="background:#012770;padding:24px 32px;">
          <div style="font-size:22px;font-weight:700;color:#fff;">HerrSoft Events</div>
          <div style="font-size:12px;color:#93c5fd;margin-top:2px;">Bienvenido al sistema</div>
        </td>
      </tr>
      <tr>
        <td style="background:#eff6ff;border-bottom:2px solid #bfdbfe;padding:14px 32px;">
          <div style="font-size:15px;font-weight:700;color:#012770;">🎉 ¡Tu cuenta está lista!</div>
          <div style="font-size:12px;color:#3b82f6;margin-top:2px;">Creada el {now_str}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px;">
          <p style="font-size:15px;color:#111827;margin:0 0 20px 0;">
            Hola <strong>{nombre}</strong>, tu cuenta en Herrsoft Events ha sido activada.
            Puedes acceder al sistema con las siguientes credenciales:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:#f8fafc;border-radius:10px;padding:16px 20px;border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:8px 0;">
                <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Correo</div>
                <div style="font-size:15px;color:#012770;font-weight:700;">{email}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-top:1px solid #e2e8f0;">
                <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Contraseña</div>
                <div style="font-size:14px;color:#374151;">La que ingresaste al crear tu cuenta.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-top:1px solid #e2e8f0;">
                <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Plan contratado</div>
                <div style="font-size:15px;color:#111827;font-weight:700;">{plan_nombre}
                  <span style="font-size:13px;color:#6b7280;font-weight:400;">{plan_precio}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-top:1px solid #e2e8f0;">
                <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Acceso</div>
                <div style="font-size:15px;">
                  <a href="{LOGIN_URL}" style="color:#012770;font-weight:700;">{LOGIN_URL}</a>
                </div>
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;
                        padding:14px 20px;margin-top:16px;">
            <tr>
              <td style="padding:0;">
                <div style="font-size:14px;font-weight:700;color:#15803d;margin-bottom:4px;">
                  {trial_icon} {trial_title}
                </div>
                <div style="font-size:13px;color:#374151;">{trial_desc}</div>
              </td>
            </tr>
          </table>
          <p style="font-size:13px;color:#6b7280;margin:20px 0 16px 0;">
            Guarda esta información en un lugar seguro. Si necesitas ayuda escríbenos
            directamente por WhatsApp o responde este correo.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:#f0f7ff;border-radius:10px;border:1px solid #bfdbfe;padding:16px 20px;">
            <tr>
              <td style="padding:0;">
                <div style="font-size:13px;font-weight:700;color:#012770;margin-bottom:6px;">
                  🖥️ App de escritorio para Windows
                </div>
                <div style="font-size:13px;color:#374151;margin-bottom:12px;">
                  Descarga la aplicación para acceder directamente desde tu escritorio,
                  sin necesidad de abrir el navegador.
                </div>
                <a href="{dl_url}"
                   style="display:inline-block;background:#012770;color:#fff;font-size:13px;
                          font-weight:700;text-decoration:none;padding:9px 20px;border-radius:8px;">
                  ⬇ Descargar para Windows
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:#f8fafc;border-top:1px solid #f0f4f8;padding:16px 32px;">
          <div style="font-size:11px;color:#9ca3af;text-align:center;">
            HerrSoft Events · <a href="mailto:soporte.herrsoft@gmail.com"
              style="color:#9ca3af;">soporte.herrsoft@gmail.com</a>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""


def _build_admin_notif_html(nombre: str, email: str, empresa: str,
                             sub_id: Optional[str], ip: str, now_str: str) -> str:
    rows = [
        ("Nombre", nombre),
        ("Correo", email),
        ("Empresa", empresa or "N/A"),
        ("Suscripción Stripe", sub_id or "N/A"),
        ("IP", ip or "N/A"),
    ]
    rows_html = "".join(
        f"""<tr><td style="padding:8px 0;border-bottom:1px solid #f0f4f8;">
          <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;">{label}</div>
          <div style="font-size:14px;color:#111827;">{value}</div>
        </td></tr>"""
        for label, value in rows
    )
    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:16px;overflow:hidden;
                  box-shadow:0 4px 16px rgba(0,0,0,0.08);max-width:580px;">
      <tr>
        <td style="background:#012770;padding:24px 32px;">
          <div style="font-size:22px;font-weight:700;color:#fff;">HerrSoft Events</div>
          <div style="font-size:12px;color:#93c5fd;margin-top:2px;">Nueva contratación</div>
        </td>
      </tr>
      <tr>
        <td style="background:#eff6ff;border-bottom:2px solid #bfdbfe;padding:14px 32px;">
          <div style="font-size:15px;font-weight:700;color:#012770;">💳 Nueva cuenta contratada</div>
          <div style="font-size:12px;color:#3b82f6;margin-top:2px;">{now_str}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">{rows_html}</table>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""


@router.post("/provision")
def provision_account(payload: ProvisionPayload, request: Request):
    """
    Crea cliente en BD administrador + usuario en BD ecosound.
    Se llama desde el frontend justo después de que Stripe confirma el pago.
    """
    from ..models.clientes import create_cliente, check_email_available_for_cliente, reactivate_cliente
    from ..utils.email import send_email_bg

    email_str = str(payload.email).strip().lower()

    # Verificar disponibilidad del correo (bloquea solo si active=1)
    error = check_email_available_for_cliente(email_str)
    if error:
        raise HTTPException(status_code=400, detail=error)

    # Detectar si existe un usuario inactivo (active=0) en ecosound para reactivar
    def _has_inactive_cliente(email: str) -> bool:
        from ..db import get_connection as _eco
        conn = _eco()
        try:
            with conn.cursor(dictionary=True) as cur:
                cur.execute(
                    "SELECT id_cliente FROM users WHERE email=%s AND active=0 AND usuario_cliente=1 LIMIT 1",
                    (email,),
                )
                return cur.fetchone() is not None
        finally:
            conn.close()

    ip = request.client.host if request.client else ""

    def _ts(v):
        try:
            return dt.datetime.fromtimestamp(int(v)).isoformat() if v is not None and int(v) > 0 else None
        except Exception:
            return None

    # Valores base que conocemos sin llamar a Stripe
    _api_key = os.getenv("STRIPE_SECRET_KEY") or STRIPE_SECRET_KEY
    trial_end_date = _calc_trial_end(payload.plan)
    stripe_extra: dict = {
        "stripe_price_id":    STRIPE_PRICE_IDS.get(payload.plan or ""),
        "suscripcion_estado": "trialing",
        "trial_end":          trial_end_date.isoformat() + "T00:00:00",
    }

    # Enriquecer con datos reales de Stripe
    if payload.stripe_subscription_id and stripe is not None and _api_key:
        try:
            sub = stripe.Subscription.retrieve(
                payload.stripe_subscription_id,
                api_key=_api_key,
            )
            stripe_extra["suscripcion_estado"]   = getattr(sub, "status", None) or "trialing"
            stripe_extra["trial_end"]            = _ts(getattr(sub, "trial_end", None))

            # API antiguas: sub.current_period_start/end. API recientes (≥2025):
            # esos campos viven en cada item de sub.items.data[].current_period_start/end
            cp_start = getattr(sub, "current_period_start", None)
            cp_end   = getattr(sub, "current_period_end", None)
            if cp_start is None or cp_end is None:
                items = getattr(sub, "items", None)
                items_data = getattr(items, "data", []) if items else []
                if items_data:
                    cp_start = cp_start if cp_start is not None else getattr(items_data[0], "current_period_start", None)
                    cp_end   = cp_end   if cp_end   is not None else getattr(items_data[0], "current_period_end", None)
            stripe_extra["current_period_start"] = _ts(cp_start)
            stripe_extra["current_period_end"]   = _ts(cp_end)

            pm = getattr(sub, "default_payment_method", None)
            if pm:
                pm_id = pm["id"] if isinstance(pm, dict) else (pm if isinstance(pm, str) else getattr(pm, "id", None))
                if pm_id:
                    stripe_extra["stripe_payment_method_id"] = pm_id
        except Exception as _e:
            print(f"[provision] Stripe retrieve falló: {_e}", flush=True)

    tipo_sub = "anual" if "anual" in (payload.plan or "") else "mensual"
    fecha_proxima_pago = _calc_trial_end(payload.plan).isoformat()
    now = dt.datetime.now()

    data = {
        "nombre_cliente":           payload.nombre.strip(),
        "apellido_cliente":         (payload.apellido or "").strip(),
        "correo":                   email_str,
        "nombre_empresa":           (payload.empresa or "").strip(),
        "celular":                  "",
        "habilitar_sistema":        True,
        "tipo_subscripcion":        tipo_sub,
        "fecha_proxima_pago":       fecha_proxima_pago,
        "fecha_fin_prueba":         None,
        "password_plain":           payload.password,
        # IDs de Stripe del frontend (base — se sobreescriben con stripe_extra si el retrieve funciona)
        "stripe_customer_id":       payload.stripe_customer_id,
        "stripe_subscription_id":   payload.stripe_subscription_id,
        "stripe_payment_method_id": payload.stripe_payment_method_id,
        # Términos y marketing
        "acepta_marketing":         1 if payload.marketing else 0,
        "terminos_ip":              ip,
        "terminos_version":         "v1.0-2026",
        "fecha_terminos_aceptados": now,
        # Datos de Stripe enriquecidos (solo sobreescriben si el valor no es None)
        **{k: v for k, v in stripe_extra.items() if v is not None},
    }

    try:
        if _has_inactive_cliente(email_str):
            result = reactivate_cliente(id_app=ID_APP, data=data)
        else:
            result = create_cliente(id_app=ID_APP, data=data, id_user=None)
        id_cliente = result["id_cliente"]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al crear la cuenta: {exc}")

    # Eliminar el registro incompleto (ya completó el proceso)
    try:
        from ..db import get_admin_connection as _get_admin
        _conn = _get_admin()
        try:
            with _conn.cursor() as _cur:
                _cur.execute(
                    "DELETE FROM registros_incompletos WHERE correo = %s",
                    (email_str,),
                )
            _conn.commit()
        finally:
            _conn.close()
    except Exception:
        pass
    now_str = dt.datetime.now().strftime("%d/%m/%Y %H:%M")

    # Construir URL de descarga desde el request (igual que ${API_URL}/contratar/descargar-app en el frontend)
    from urllib.parse import urlparse, urlunparse
    _parsed = urlparse(str(request.url))
    _dl_path = _parsed.path.replace("/provision", "/descargar-app")
    download_url = urlunparse(_parsed._replace(path=_dl_path, query="", fragment=""))

    welcome_html = _build_welcome_html(payload.nombre.strip(), email_str, payload.password, payload.plan or "herrsoft_events_mensual", download_url)
    send_email_bg(
        [email_str],
        "¡Tu cuenta en Herrsoft Events está lista!",
        welcome_html,
    )

    admin_html = _build_admin_notif_html(
        payload.nombre.strip(), email_str,
        (payload.empresa or "").strip(),
        payload.stripe_subscription_id, ip, now_str,
    )
    send_email_bg(
        ADMIN_EMAILS,
        f"Nueva contratación: {payload.nombre.strip()}",
        admin_html,
    )

    return {"ok": True, "id_cliente": id_cliente}


# ─── WEBHOOK DE STRIPE ───────────────────────────────────────────────────────

def _invoice_subscription_id(invoice_obj) -> Optional[str]:
    """
    Extrae el subscription id de un Invoice. En API versions recientes de Stripe
    (≥ 2025), Invoice.subscription fue removido y el dato vive en
    invoice.parent.subscription_details.subscription. Soportamos ambas formas.
    """
    v = getattr(invoice_obj, "subscription", None)
    if v:
        return v if isinstance(v, str) else getattr(v, "id", None)

    parent = getattr(invoice_obj, "parent", None)
    if parent is not None:
        sub_details = getattr(parent, "subscription_details", None)
        if sub_details is not None:
            v = getattr(sub_details, "subscription", None)
            if v:
                return v if isinstance(v, str) else getattr(v, "id", None)

    return None


def _sub_id_from_event(etype: str, obj) -> Optional[str]:
    """Extrae el stripe_subscription_id según el tipo de evento."""
    if etype in ("customer.subscription.updated", "customer.subscription.deleted"):
        return str(getattr(obj, "id", None) or "")
    if etype == "invoice.payment_succeeded" or etype == "invoice.payment_failed":
        return str(_invoice_subscription_id(obj) or "")
    if etype == "setup_intent.succeeded":
        meta = getattr(obj, "metadata", {}) or {}
        return str(meta.get("subscription_id", "") if isinstance(meta, dict) else getattr(meta, "subscription_id", ""))
    return None


def _get_cliente_by_sub(sub_id: str) -> Optional[dict]:
    from ..db import get_admin_connection as _adm
    conn = _adm()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id_cliente, correo, cancel_at_period_end "
                "FROM clientes WHERE stripe_subscription_id=%s AND active=1 LIMIT 1",
                (sub_id,),
            )
            return cur.fetchone()
    finally:
        conn.close()


def _update_payment_method_id(sub_id: str, pm_id: str) -> None:
    from ..db import get_admin_connection as _adm
    conn = _adm()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE clientes SET stripe_payment_method_id=%s WHERE stripe_subscription_id=%s",
                (pm_id, sub_id),
            )
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()


def _update_suscripcion_estado(sub_id: str, estado: str) -> None:
    from ..db import get_admin_connection as _adm
    conn = _adm()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE clientes SET suscripcion_estado=%s WHERE stripe_subscription_id=%s",
                (estado, sub_id),
            )
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()


def _desactivar_cliente_by_sub(sub_id: str) -> None:
    from ..db import get_admin_connection as _adm, get_connection as _eco
    conn = _adm()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id_cliente FROM clientes WHERE stripe_subscription_id=%s AND active=1 LIMIT 1",
                (sub_id,),
            )
            row = cur.fetchone()
        if not row:
            return
        id_cliente = row["id_cliente"]
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE apps_clientes SET habilitar_sistema=0 WHERE id_cliente=%s",
                (id_cliente,),
            )
            cur.execute(
                "UPDATE clientes SET suscripcion_estado='canceled' WHERE id_cliente=%s",
                (id_cliente,),
            )
        conn.commit()
    finally:
        conn.close()
    ec = _eco()
    try:
        with ec.cursor() as cur:
            # Se desactivan TODAS las cuentas asociadas a este id_cliente (no solo
            # la cuenta principal del cliente), ya que la suscripción cubre a toda
            # la organización y todas pierden acceso al cancelarse.
            cur.execute(
                "UPDATE users SET active=0 WHERE id_cliente=%s",
                (id_cliente,),
            )
        ec.commit()
    except Exception:
        pass
    finally:
        ec.close()


_PAYMENT_PLAN_INFO = {
    "mensual": ("Plan Mensual", "$550 MXN / mes"),
    "anual":   ("Plan Anual",   "$5,500 MXN / año"),
}


def _build_payment_notif_html(nombre: str, correo: str, monto: str, moneda: str,
                               plan_tipo: str, fecha_pago_str: str,
                               proxima_pago_str: str, sub_id: Optional[str]) -> str:
    plan_label, plan_precio = _PAYMENT_PLAN_INFO.get(plan_tipo, ("Plan Mensual", "$550 MXN / mes"))
    rows = [
        ("Cliente", nombre or "N/A"),
        ("Correo", correo or "N/A"),
        ("Monto cobrado", f"${monto} {moneda}"),
        ("Tipo de plan", f"{plan_label} — {plan_precio}"),
        ("Fecha y hora del pago", fecha_pago_str),
        ("Próximo cobro", proxima_pago_str),
        ("Suscripción Stripe", sub_id or "N/A"),
    ]
    rows_html = "".join(
        f"""<tr><td style="padding:8px 0;border-bottom:1px solid #f0f4f8;">
          <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;">{label}</div>
          <div style="font-size:14px;color:#111827;font-weight:600;">{value}</div>
        </td></tr>"""
        for label, value in rows
    )
    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:16px;overflow:hidden;
                  box-shadow:0 4px 16px rgba(0,0,0,0.08);max-width:580px;">
      <tr>
        <td style="background:#15803d;padding:24px 32px;">
          <div style="font-size:22px;font-weight:700;color:#fff;">HerrSoft Events</div>
          <div style="font-size:12px;color:#bbf7d0;margin-top:2px;">Notificación de pago recibido</div>
        </td>
      </tr>
      <tr>
        <td style="background:#f0fdf4;border-bottom:2px solid #bbf7d0;padding:14px 32px;">
          <div style="font-size:15px;font-weight:700;color:#15803d;">💰 ¡Se recibió un pago!</div>
          <div style="font-size:12px;color:#16a34a;margin-top:2px;">{fecha_pago_str}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px;">
          <p style="font-size:14px;color:#374151;margin:0 0 16px 0;">
            El cliente <strong>{nombre or correo}</strong> realizó un pago por su suscripción
            a Herrsoft Events. Aquí están los detalles:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">{rows_html}</table>
          <p style="font-size:12px;color:#9ca3af;margin:18px 0 0 0;">
            Este es un aviso automático generado al confirmarse el cobro en Stripe.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""


def _build_payment_receipt_html(nombre: str, monto: str, moneda: str, plan_tipo: str,
                                 fecha_pago_str: str, proxima_pago_str: str,
                                 pdf_url: Optional[str]) -> str:
    plan_label = "Plan Anual" if plan_tipo == "anual" else "Plan Mensual"
    rows = [
        ("Monto pagado", f"${monto} {moneda}"),
        ("Tipo de plan", f"HerrSoft Events · {plan_label}"),
        ("Fecha y hora del pago", fecha_pago_str),
        ("Próximo cobro", proxima_pago_str),
    ]
    rows_html = "".join(
        f"""<tr><td style="padding:8px 0;border-bottom:1px solid #f0f4f8;">
          <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;">{label}</div>
          <div style="font-size:14px;color:#111827;font-weight:600;">{value}</div>
        </td></tr>"""
        for label, value in rows
    )
    factura_html = (
        f"""<a href="{pdf_url}" target="_blank" rel="noopener"
              style="display:inline-block;background:#012770;color:#fff;font-size:13px;
                     font-weight:700;text-decoration:none;padding:10px 22px;border-radius:8px;
                     margin-top:18px;">⬇ Descargar recibo (PDF)</a>"""
        if pdf_url else ""
    )
    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:16px;overflow:hidden;
                  box-shadow:0 4px 16px rgba(0,0,0,0.08);max-width:580px;">
      <tr>
        <td style="background:#012770;padding:24px 32px;">
          <div style="font-size:22px;font-weight:700;color:#fff;">HerrSoft Events</div>
          <div style="font-size:12px;color:#bfdbfe;margin-top:2px;">Confirmación de pago</div>
        </td>
      </tr>
      <tr>
        <td style="background:#eff6ff;border-bottom:2px solid #bfdbfe;padding:14px 32px;">
          <div style="font-size:15px;font-weight:700;color:#012770;">✅ ¡Tu pago se realizó con éxito!</div>
          <div style="font-size:12px;color:#1d4ed8;margin-top:2px;">{fecha_pago_str}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px;">
          <p style="font-size:14px;color:#374151;margin:0 0 16px 0;">
            Hola {nombre or "cliente"}, gracias por tu pago. Confirmamos que recibimos correctamente
            el cobro de tu suscripción a Herrsoft Events. Aquí están los detalles:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">{rows_html}</table>
          {factura_html}
          <p style="font-size:12px;color:#9ca3af;margin:18px 0 0 0;">
            Si no reconoces este cargo o tienes alguna duda, por favor contáctanos respondiendo
            este correo y con gusto te ayudaremos.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""


def _registrar_pago_stripe(invoice_obj) -> None:
    """Guarda el pago exitoso de Stripe en administrador.clientes_pagos."""
    from ..db import get_admin_connection as _adm

    sub_id = _invoice_subscription_id(invoice_obj)
    if not sub_id:
        return

    row = _get_cliente_by_sub(str(sub_id))
    if not row:
        return
    id_cliente = row["id_cliente"]

    inv_id  = getattr(invoice_obj, "id", None)
    cust_id = getattr(invoice_obj, "customer", None)
    if cust_id and not isinstance(cust_id, str):
        cust_id = getattr(cust_id, "id", None)
    # API antiguas: invoice.payment_intent. API recientes (≥2025): el PaymentIntent
    # vive dentro de invoice.payments.data[].payment.payment_intent
    pi_id = getattr(invoice_obj, "payment_intent", None)
    if pi_id and not isinstance(pi_id, str):
        pi_id = getattr(pi_id, "id", None)
    if not pi_id:
        payments = getattr(invoice_obj, "payments", None)
        pay_data = getattr(payments, "data", []) if payments else []
        for p in pay_data:
            payment = getattr(p, "payment", None)
            pi = getattr(payment, "payment_intent", None) if payment else None
            if pi:
                pi_id = pi if isinstance(pi, str) else getattr(pi, "id", None)
            if pi_id:
                break

    amount_paid = getattr(invoice_obj, "amount_paid", 0) or 0
    monto       = f"{amount_paid / 100:.2f}"
    moneda      = (getattr(invoice_obj, "currency", "mxn") or "mxn").upper()
    estado      = getattr(invoice_obj, "status", "paid") or "paid"
    pdf_url     = getattr(invoice_obj, "invoice_pdf", None)

    def _ts_dt(v):
        try:
            return dt.datetime.fromtimestamp(int(v)) if v and int(v) > 0 else None
        except Exception:
            return None

    periodo_inicio = _ts_dt(getattr(invoice_obj, "period_start", None))
    periodo_fin    = _ts_dt(getattr(invoice_obj, "period_end",   None))

    # plan_tipo desde las líneas del invoice
    plan_tipo = "mensual"
    try:
        lines = getattr(invoice_obj, "lines", None)
        data_lines = getattr(lines, "data", []) if lines else []
        if data_lines:
            interval = getattr(getattr(data_lines[0], "plan", None), "interval", None)
            if interval == "year":
                plan_tipo = "anual"
    except Exception:
        pass

    conn = _adm()
    inserted = False
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO clientes_pagos
                    (id_cliente, monto, datetime, fecha_pago, id_app, id_user,
                     stripe_invoice_id, stripe_subscription_id, stripe_customer_id,
                     stripe_payment_intent_id, moneda, estado,
                     periodo_inicio, periodo_fin, pdf_url, plan_tipo, metodo_pago,
                     is_mensual_pago)
                VALUES (%s,%s,NOW(),NOW(),%s,0,
                        %s,%s,%s,%s,%s,%s,
                        %s,%s,%s,%s,'stripe',%s)
                """,
                (
                    id_cliente, monto, ID_APP,
                    inv_id, sub_id, cust_id,
                    pi_id, moneda, estado,
                    periodo_inicio, periodo_fin, pdf_url, plan_tipo,
                    1 if plan_tipo == "mensual" else 0,
                ),
            )
        conn.commit()
        inserted = True
    except Exception as exc:
        print(f"[webhook] Error registrar_pago: {exc}", flush=True)
    finally:
        conn.close()

    if not inserted:
        return

    # Notificar por correo a los administradores que se recibió un pago
    try:
        from ..models.clientes import get_cliente_by_id
        from ..utils.email import send_email_bg

        cli = get_cliente_by_id(ID_APP, id_cliente) or {}
        nombre_cli = (
            f"{cli.get('nombre_cliente', '')} {cli.get('apellido_cliente', '')}".strip()
            or row.get("correo", "")
        )
        correo_cli = cli.get("correo") or row.get("correo", "")

        status_transitions = getattr(invoice_obj, "status_transitions", None)
        paid_at_ts = getattr(status_transitions, "paid_at", None) if status_transitions else None
        fecha_pago_dt = (
            _ts_dt(paid_at_ts)
            or _ts_dt(getattr(invoice_obj, "created", None))
            or dt.datetime.now()
        )
        fecha_pago_str = fecha_pago_dt.strftime("%d/%m/%Y a las %H:%M hrs")

        proxima_pago_str = (
            periodo_fin.strftime("%d/%m/%Y") if periodo_fin else "Se confirmará en el próximo ciclo de facturación"
        )

        payment_html = _build_payment_notif_html(
            nombre_cli, correo_cli, monto, moneda, plan_tipo,
            fecha_pago_str, proxima_pago_str, str(sub_id),
        )
        send_email_bg(
            ADMIN_EMAILS,
            f"💰 Pago recibido — {nombre_cli or correo_cli}",
            payment_html,
        )

        # Enviar al cliente su confirmación/recibo de pago
        if correo_cli:
            receipt_html = _build_payment_receipt_html(
                nombre_cli, monto, moneda, plan_tipo,
                fecha_pago_str, proxima_pago_str, pdf_url,
            )
            send_email_bg(
                [correo_cli],
                "✅ Confirmación de tu pago — Herrsoft Events",
                receipt_html,
            )
    except Exception as exc:
        print(f"[webhook] Error notificando pago: {exc}", flush=True)


def _send_payment_failed_email(email: str, nombre: str) -> None:
    try:
        from ..utils.email import send_email_bg
        html = f"""<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08);max-width:560px;">
      <tr><td style="background:#b91c1c;padding:22px 32px;">
        <div style="font-size:20px;font-weight:700;color:#fff;">HerrSoft Events</div>
        <div style="font-size:12px;color:#fca5a5;margin-top:2px;">Aviso de cobro fallido</div>
      </td></tr>
      <tr><td style="padding:28px 32px;">
        <p style="font-size:15px;color:#111827;margin:0 0 16px;">
          Hola <strong>{nombre}</strong>, no pudimos procesar el cobro de tu suscripción.
        </p>
        <p style="font-size:14px;color:#6b7280;margin:0 0 16px;">
          Por favor actualiza tu método de pago para mantener tu cuenta activa. Si no se resuelve,
          tu cuenta podría suspenderse automáticamente.
        </p>
        <p style="font-size:13px;color:#9ca3af;margin:0;">
          Si necesitas ayuda escríbenos a <a href="mailto:soporte.herrsoft@gmail.com">soporte.herrsoft@gmail.com</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>"""
        send_email_bg([email], "⚠️ Cobro fallido — Herrsoft Events", html)
    except Exception:
        pass


def _build_cancellation_admin_html(nombre: str, correo: str, sub_id: Optional[str],
                                    cancel_str: str, ultimo_str: Optional[str]) -> str:
    rows = [
        ("Cliente", nombre or "N/A"),
        ("Correo", correo or "N/A"),
        ("Cancelada el", cancel_str),
        ("Acceso terminó", ultimo_str or "De inmediato, al recibirse el evento"),
        ("Suscripción Stripe", sub_id or "N/A"),
    ]
    rows_html = "".join(
        f"""<tr><td style="padding:8px 0;border-bottom:1px solid #f0f4f8;">
          <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;">{label}</div>
          <div style="font-size:14px;color:#111827;font-weight:600;">{value}</div>
        </td></tr>"""
        for label, value in rows
    )
    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:16px;overflow:hidden;
                  box-shadow:0 4px 16px rgba(0,0,0,0.08);max-width:580px;">
      <tr>
        <td style="background:#7f1d1d;padding:24px 32px;">
          <div style="font-size:22px;font-weight:700;color:#fff;">HerrSoft Events</div>
          <div style="font-size:12px;color:#fecaca;margin-top:2px;">Notificación de cancelación de suscripción</div>
        </td>
      </tr>
      <tr>
        <td style="background:#fef2f2;border-bottom:2px solid #fecaca;padding:14px 32px;">
          <div style="font-size:15px;font-weight:700;color:#991b1b;">🔴 Una suscripción fue cancelada</div>
          <div style="font-size:12px;color:#b91c1c;margin-top:2px;">{cancel_str}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px;">
          <p style="font-size:14px;color:#374151;margin:0 0 16px 0;">
            La suscripción del cliente <strong>{nombre or correo}</strong> a Herrsoft Events
            terminó por completo y su cuenta quedó desactivada. Detalles:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">{rows_html}</table>
          <p style="font-size:12px;color:#9ca3af;margin:18px 0 0 0;">
            Este es un aviso automático generado al procesarse el evento de cancelación en Stripe.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""


def _send_subscription_canceled_email(correo: str, nombre: str,
                                       fecha_cancelacion: "dt.datetime",
                                       fecha_ultimo_dia: Optional["dt.datetime"],
                                       sub_id: Optional[str] = None) -> None:
    """Avisa al cliente que su suscripción a Herrsoft Events fue cancelada, y notifica
    por separado a soporte/admin con un formato más informativo (con datos del cliente)."""
    try:
        from ..utils.email import send_email_bg

        cancel_str = fecha_cancelacion.strftime("%d/%m/%Y a las %H:%M hrs")
        if fecha_ultimo_dia:
            ultimo_str = _fecha_larga_es(fecha_ultimo_dia)
            acceso_html = (
                f"<p style=\"font-size:14px;color:#374151;margin:0 0 16px 0;\">"
                f"Tu acceso a la plataforma seguirá activo hasta el <strong>{ultimo_str}</strong>, "
                f"fecha en la que termina el periodo que ya pagaste. A partir de ese día tu cuenta "
                f"se desactivará automáticamente y dejarás de tener acceso al sistema."
                f"</p>"
            )
        else:
            acceso_html = (
                "<p style=\"font-size:14px;color:#374151;margin:0 0 16px 0;\">"
                "Tu acceso al sistema ha sido desactivado a partir de este momento."
                "</p>"
            )

        html = f"""<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08);max-width:560px;">
      <tr><td style="background:#374151;padding:24px 32px;">
        <div style="font-size:20px;font-weight:700;color:#fff;">HerrSoft Events</div>
        <div style="font-size:12px;color:#d1d5db;margin-top:2px;">Confirmación de cancelación de suscripción</div>
      </td></tr>
      <tr><td style="padding:28px 32px;">
        <p style="font-size:15px;color:#111827;margin:0 0 16px;">
          Hola <strong>{nombre or correo}</strong>, te confirmamos que tu suscripción a
          <strong>Herrsoft Events</strong> fue cancelada correctamente el
          <strong>{cancel_str}</strong>, tal como lo solicitaste desde tu portal de facturación.
        </p>
        {acceso_html}
        <p style="font-size:14px;color:#374151;margin:0 0 16px 0;">
          Lamentamos verte partir. Si esta cancelación fue un error, o si en el futuro deseas
          reactivar tu cuenta, con gusto te ayudamos a configurarlo de nuevo.
        </p>
        <p style="font-size:13px;color:#9ca3af;margin:0;">
          ¿Dudas o necesitas ayuda? Escríbenos a
          <a href="mailto:soporte.herrsoft@gmail.com">soporte.herrsoft@gmail.com</a> y con gusto te apoyamos.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>"""

        if correo:
            send_email_bg([correo], "Tu suscripción a Herrsoft Events ha sido cancelada", html)

        ultimo_str = _fecha_larga_es(fecha_ultimo_dia) if fecha_ultimo_dia else None
        admin_html = _build_cancellation_admin_html(nombre, correo, sub_id, cancel_str, ultimo_str)
        send_email_bg(ADMIN_EMAILS, f"🔴 Suscripción cancelada — {nombre or correo}", admin_html)
    except Exception:
        pass


def _build_cancel_scheduled_html(nombre: str, correo: str, fecha_solicitud_str: str,
                                  fecha_fin_str: Optional[str]) -> str:
    if fecha_fin_str:
        acceso_html = (
            f"<p style=\"font-size:14px;color:#374151;margin:0 0 16px 0;\">"
            f"Tu cuenta seguirá activa con todos sus beneficios hasta el "
            f"<strong>{fecha_fin_str}</strong>, fecha en la que se cancelará automáticamente "
            f"y no se realizarán más cobros."
            f"</p>"
        )
    else:
        acceso_html = (
            "<p style=\"font-size:14px;color:#374151;margin:0 0 16px 0;\">"
            "Tu cuenta seguirá activa hasta el final de tu periodo de facturación actual, "
            "fecha en la que se cancelará automáticamente y no se realizarán más cobros."
            "</p>"
        )
    return f"""<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08);max-width:560px;">
      <tr><td style="background:#92400e;padding:24px 32px;">
        <div style="font-size:20px;font-weight:700;color:#fff;">HerrSoft Events</div>
        <div style="font-size:12px;color:#fde68a;margin-top:2px;">Solicitud de cancelación recibida</div>
      </td></tr>
      <tr><td style="padding:28px 32px;">
        <p style="font-size:15px;color:#111827;margin:0 0 16px;">
          Hola <strong>{nombre or correo}</strong>, recibimos tu solicitud para cancelar tu
          suscripción a <strong>Herrsoft Events</strong>, registrada el
          <strong>{fecha_solicitud_str}</strong>.
        </p>
        {acceso_html}
        <p style="font-size:14px;color:#374151;margin:0 0 16px 0;">
          Si cambiaste de opinión, puedes reactivar tu suscripción antes de esa fecha desde
          <strong>Mi cuenta → Métodos de pago y suscripción</strong> en el portal de facturación.
        </p>
        <p style="font-size:13px;color:#9ca3af;margin:0;">
          ¿Dudas o necesitas ayuda? Escríbenos a
          <a href="mailto:soporte.herrsoft@gmail.com">soporte.herrsoft@gmail.com</a> y con gusto te apoyamos.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>"""


def _build_cancel_scheduled_admin_html(nombre: str, correo: str, sub_id: Optional[str],
                                        fecha_solicitud_str: str, fecha_fin_str: Optional[str]) -> str:
    rows = [
        ("Cliente", nombre or "N/A"),
        ("Correo", correo or "N/A"),
        ("Solicitud registrada", fecha_solicitud_str),
        ("Acceso activo hasta", fecha_fin_str or "Fin del periodo de facturación actual"),
        ("Suscripción Stripe", sub_id or "N/A"),
    ]
    rows_html = "".join(
        f"""<tr><td style="padding:8px 0;border-bottom:1px solid #f0f4f8;">
          <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;">{label}</div>
          <div style="font-size:14px;color:#111827;font-weight:600;">{value}</div>
        </td></tr>"""
        for label, value in rows
    )
    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:16px;overflow:hidden;
                  box-shadow:0 4px 16px rgba(0,0,0,0.08);max-width:580px;">
      <tr>
        <td style="background:#92400e;padding:24px 32px;">
          <div style="font-size:22px;font-weight:700;color:#fff;">HerrSoft Events</div>
          <div style="font-size:12px;color:#fde68a;margin-top:2px;">Notificación de solicitud de cancelación</div>
        </td>
      </tr>
      <tr>
        <td style="background:#fffbeb;border-bottom:2px solid #fde68a;padding:14px 32px;">
          <div style="font-size:15px;font-weight:700;color:#92400e;">📋 Un cliente solicitó cancelar su suscripción</div>
          <div style="font-size:12px;color:#b45309;margin-top:2px;">{fecha_solicitud_str}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px;">
          <p style="font-size:14px;color:#374151;margin:0 0 16px 0;">
            El cliente <strong>{nombre or correo}</strong> programó la cancelación de su
            suscripción a Herrsoft Events desde el portal de facturación. Su cuenta seguirá
            activa hasta la fecha indicada abajo. Detalles:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">{rows_html}</table>
          <p style="font-size:12px;color:#9ca3af;margin:18px 0 0 0;">
            Este es un aviso automático generado al detectarse el cambio en Stripe
            (cancel_at_period_end / cancel_at).
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""


def _send_subscription_cancel_scheduled_email(correo: str, nombre: str,
                                               fecha_solicitud: "dt.datetime",
                                               fecha_fin: Optional["dt.datetime"],
                                               sub_id: Optional[str] = None) -> None:
    """Avisa al cliente que se recibió su solicitud de cancelación (cancel_at_period_end /
    cancel_at), y notifica por separado a soporte/admin con un formato más informativo
    (con datos del cliente), antes de que la suscripción termine por completo."""
    try:
        from ..utils.email import send_email_bg

        fecha_solicitud_str = fecha_solicitud.strftime("%d/%m/%Y a las %H:%M hrs")
        fecha_fin_str = _fecha_larga_es(fecha_fin) if fecha_fin else None

        if correo:
            client_html = _build_cancel_scheduled_html(nombre, correo, fecha_solicitud_str, fecha_fin_str)
            send_email_bg([correo], "Recibimos tu solicitud de cancelación — Herrsoft Events", client_html)

        admin_html = _build_cancel_scheduled_admin_html(nombre, correo, sub_id, fecha_solicitud_str, fecha_fin_str)
        send_email_bg(ADMIN_EMAILS, f"📋 Solicitud de cancelación — {nombre or correo}", admin_html)
    except Exception:
        pass


def _set_cancel_at_period_end_flag(sub_id: str, flag: bool) -> None:
    from ..db import get_admin_connection as _adm
    conn = _adm()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE clientes SET cancel_at_period_end=%s WHERE stripe_subscription_id=%s",
                (1 if flag else 0, sub_id),
            )
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()


def _webhook_provision(sub_id: str) -> None:
    """Safety net: provisionar cuenta si aún no existe en BD."""
    if not sub_id:
        return
    if _get_cliente_by_sub(sub_id):
        return  # ya provisionado

    from ..models.clientes import create_cliente, check_email_available_for_cliente
    from ..db import get_admin_connection as _adm, get_connection as _eco
    from ..utils.email import send_email_bg
    import secrets as _sec

    # Obtener datos de Stripe
    try:
        sub = stripe.Subscription.retrieve(str(sub_id))
        cust_id = getattr(sub, "customer", None)
        if cust_id and not isinstance(cust_id, str):
            cust_id = getattr(cust_id, "id", None)
        cust = stripe.Customer.retrieve(str(cust_id))
        email_str = (getattr(cust, "email", None) or "").strip().lower()
        nombre_full = getattr(cust, "name", None) or ""
        meta = getattr(cust, "metadata", {}) or {}
        plan = (meta.get("plan_solicitado") if isinstance(meta, dict) else getattr(meta, "plan_solicitado", None)) or "herrsoft_events_mensual"
        empresa = (meta.get("empresa") if isinstance(meta, dict) else getattr(meta, "empresa", None)) or ""
    except Exception as exc:
        print(f"[webhook] provision: error Stripe: {exc}", flush=True)
        return

    if not email_str:
        return
    if check_email_available_for_cliente(email_str):
        return  # email ya en uso

    # Buscar en registros_incompletos
    conn = _adm()
    reg = None
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT * FROM registros_incompletos WHERE correo=%s ORDER BY datetime DESC LIMIT 1",
                (email_str,),
            )
            reg = cur.fetchone()
    finally:
        conn.close()

    parts = nombre_full.strip().split(" ", 1)
    nombre  = (reg["nombre"]  if reg else parts[0]) or ""
    apellido = (reg.get("apellido", "") if reg else (parts[1] if len(parts) > 1 else "")) or ""
    empresa = (reg["empresa"] if reg else empresa) or ""
    marketing = int(reg.get("enviar_correo", 0)) if reg else 0

    tipo_sub = "anual" if "anual" in plan.lower() else "mensual"
    trial_end_date = _calc_trial_end(plan)
    tmp_pwd = _sec.token_urlsafe(16)

    data = {
        "nombre_cliente":           nombre,
        "apellido_cliente":         apellido,
        "correo":                   email_str,
        "nombre_empresa":           empresa,
        "celular":                  "",
        "habilitar_sistema":        True,
        "tipo_subscripcion":        tipo_sub,
        "fecha_proxima_pago":       trial_end_date.isoformat(),
        "fecha_fin_prueba":         None,
        "password_plain":           tmp_pwd,
        "stripe_customer_id":       str(cust_id) if cust_id else None,
        "stripe_subscription_id":   str(sub_id),
        "stripe_price_id":          STRIPE_PRICE_IDS.get(plan),
        "suscripcion_estado":       getattr(sub, "status", "trialing"),
        "trial_end":                trial_end_date.isoformat() + "T00:00:00",
        "acepta_marketing":         marketing,
        "terminos_ip":              "",
        "terminos_version":         "v1.0-2026",
        "fecha_terminos_aceptados": dt.datetime.now(),
    }

    try:
        result = create_cliente(id_app=ID_APP, data=data, id_user=None)
        id_cliente = result["id_cliente"]
    except Exception as exc:
        print(f"[webhook] provision create_cliente error: {exc}", flush=True)
        return

    # Restaurar el hash real de contraseña desde registros_incompletos
    if reg and reg.get("password"):
        raw = reg["password"]
        real_hash = bytes(raw).decode("latin-1") if isinstance(raw, (bytes, bytearray, memoryview)) else str(raw)
        for get_conn in (_eco, _adm):
            try:
                c = get_conn()
                with c.cursor() as cur:
                    cur.execute(
                        "UPDATE users SET password=%s WHERE id_cliente=%s AND usuario_cliente=1",
                        (real_hash, id_cliente),
                    )
                c.commit()
                c.close()
            except Exception:
                pass

    # Eliminar registro incompleto
    try:
        c = _adm()
        with c.cursor() as cur:
            cur.execute("DELETE FROM registros_incompletos WHERE correo=%s", (email_str,))
        c.commit()
        c.close()
    except Exception:
        pass

    # Email de bienvenida
    try:
        welcome_html = _build_welcome_html(nombre, email_str, "", plan, "")
        send_email_bg([email_str], "¡Tu cuenta en Herrsoft Events está lista!", welcome_html)
    except Exception:
        pass

    print(f"[webhook] provisionado via webhook: {email_str} id_cliente={id_cliente}", flush=True)


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Webhook de Stripe. Cubre 4 escenarios:
    1. setup_intent.succeeded       → safety net provision (trial)
    2. invoice.payment_succeeded    → safety net + trialing→active al primer cobro
    3. invoice.payment_failed       → email al cliente
    4. customer.subscription.deleted → desactivar cuenta
    5. customer.subscription.updated → sync estado en BD
    """
    if stripe is None:
        raise HTTPException(status_code=500, detail="Stripe SDK no disponible.")

    raw_body = await request.body()
    sig = request.headers.get("stripe-signature", "")
    wh_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")

    try:
        if wh_secret:
            event = stripe.Webhook.construct_event(raw_body, sig, wh_secret)
        else:
            import json as _json
            event = stripe.Event.construct_from(_json.loads(raw_body), stripe.api_key)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Webhook inválido: {exc}")

    etype = getattr(event, "type", None) or ""
    edata = getattr(event, "data", None)
    obj   = getattr(edata, "object", None) if edata else None

    sub_id = _sub_id_from_event(etype, obj)

    if etype == "setup_intent.succeeded":
        _webhook_provision(sub_id)

    elif etype == "invoice.payment_succeeded":
        # Safety net: provision si no existe
        _webhook_provision(sub_id)
        # Registrar el pago en clientes_pagos
        if obj:
            _registrar_pago_stripe(obj)
        # Actualizar estado trialing → active
        if sub_id:
            _update_suscripcion_estado(sub_id, "active")

    elif etype == "invoice.payment_failed":
        # Notificar al cliente del cobro fallido
        if sub_id:
            row = _get_cliente_by_sub(sub_id)
            if row and row.get("correo"):
                from ..models.clientes import get_cliente_by_id
                cli = get_cliente_by_id(ID_APP, row["id_cliente"])
                nombre_cli = f"{cli.get('nombre_cliente', '')} {cli.get('apellido_cliente', '')}".strip() if cli else ""
                _send_payment_failed_email(row["correo"], nombre_cli)
            _update_suscripcion_estado(sub_id, "past_due")

    elif etype == "customer.subscription.deleted":
        if sub_id:
            row = _get_cliente_by_sub(sub_id)
            _desactivar_cliente_by_sub(sub_id)
            if row and row.get("correo"):
                from ..models.clientes import get_cliente_by_id

                def _ts_dt(v):
                    try:
                        return dt.datetime.fromtimestamp(int(v)) if v and int(v) > 0 else None
                    except Exception:
                        return None

                cli = get_cliente_by_id(ID_APP, row["id_cliente"])
                nombre_cli = f"{cli.get('nombre_cliente', '')} {cli.get('apellido_cliente', '')}".strip() if cli else ""
                fecha_cancelacion = _ts_dt(getattr(obj, "canceled_at", None)) or dt.datetime.now()
                fecha_ultimo_dia = _ts_dt(getattr(obj, "current_period_end", None)) or _ts_dt(getattr(obj, "ended_at", None))
                _send_subscription_canceled_email(row["correo"], nombre_cli, fecha_cancelacion, fecha_ultimo_dia, sub_id)

    elif etype == "customer.subscription.updated":
        if sub_id:
            status = getattr(obj, "status", None)
            if status:
                _update_suscripcion_estado(sub_id, status)

            # Sincronizar método de pago por defecto si cambió (ej. cliente actualizó tarjeta en portal)
            pm = getattr(obj, "default_payment_method", None)
            if pm:
                pm_id = pm if isinstance(pm, str) else getattr(pm, "id", None)
                if pm_id:
                    _update_payment_method_id(sub_id, pm_id)

            # Detectar el momento en que el cliente da clic en "Cancelar suscripción".
            # Según cómo esté configurado el Portal de Clientes en Stripe, la cancelación
            # programada puede reflejarse de dos formas distintas en el objeto Subscription:
            #   - cancel_at_period_end = True   (cancelar al final del periodo actual)
            #   - cancel_at = <timestamp>       (cancelar en una fecha programada específica)
            # Contemplamos ambas para no perder el evento.
            cancel_at_ts = getattr(obj, "cancel_at", None)
            cancel_at_period_end = bool(getattr(obj, "cancel_at_period_end", False))
            cancel_scheduled = cancel_at_period_end or bool(cancel_at_ts)

            row = _get_cliente_by_sub(sub_id)
            if row:
                prev_flag = bool(row.get("cancel_at_period_end"))
                if cancel_scheduled != prev_flag:
                    _set_cancel_at_period_end_flag(sub_id, cancel_scheduled)
                    if cancel_scheduled and not prev_flag and row.get("correo"):
                        def _ts_dt(v):
                            try:
                                return dt.datetime.fromtimestamp(int(v)) if v and int(v) > 0 else None
                            except Exception:
                                return None

                        # Fecha en la que se desactivará la cuenta: preferimos cancel_at
                        # (fecha programada explícita); si no existe, usamos el fin del
                        # periodo de facturación actual.
                        cp_end = cancel_at_ts if cancel_at_ts else getattr(obj, "current_period_end", None)
                        if cp_end is None:
                            items = getattr(obj, "items", None)
                            items_data = getattr(items, "data", []) if items else []
                            if items_data:
                                cp_end = getattr(items_data[0], "current_period_end", None)

                        from ..models.clientes import get_cliente_by_id
                        cli = get_cliente_by_id(ID_APP, row["id_cliente"])
                        nombre_cli = (
                            f"{cli.get('nombre_cliente', '')} {cli.get('apellido_cliente', '')}".strip()
                            if cli else ""
                        )
                        _send_subscription_cancel_scheduled_email(
                            row["correo"], nombre_cli, dt.datetime.now(), _ts_dt(cp_end), sub_id,
                        )

    return {"received": True}
