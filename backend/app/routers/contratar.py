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

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr

try:
    import stripe  # type: ignore
except ImportError:
    stripe = None  # type: ignore

router = APIRouter(prefix="/contratar", tags=["contratar"])

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PRICE_ID = os.getenv("STRIPE_PRICE_ID", "")

if stripe is not None and STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


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
    if not STRIPE_SECRET_KEY or not STRIPE_PRICE_ID:
        raise HTTPException(
            status_code=500,
            detail="Stripe no está configurado (faltan STRIPE_SECRET_KEY o STRIPE_PRICE_ID).",
        )

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

        subscription = stripe.Subscription.create(
            customer=customer.id,
            items=[{"price": STRIPE_PRICE_ID}],
            payment_behavior="default_incomplete",
            payment_settings={
                "save_default_payment_method": "on_subscription",
                "payment_method_types": ["card"],
            },
            expand=[
                "latest_invoice.confirmation_secret",
                "latest_invoice.payment_intent",
            ],
        )

        invoice = subscription.latest_invoice
        client_secret = _extract_client_secret(invoice)

        if not client_secret and invoice is not None:
            # Algunas versiones del API ya no devuelven payment_intent ni
            # confirmation_secret expandidos al crear la Subscription. En ese
            # caso recuperamos el invoice por separado pidiendo el confirmation_secret.
            invoice_id = getattr(invoice, "id", None)
            if invoice_id:
                fresh_invoice = stripe.Invoice.retrieve(
                    invoice_id,
                    expand=["confirmation_secret", "payment_intent"],
                )
                client_secret = _extract_client_secret(fresh_invoice)

        if not client_secret:
            # Log diagnóstico para identificar qué estructura devolvió Stripe
            try:
                inv_keys = list(invoice.keys()) if invoice else []
            except Exception:
                inv_keys = []
            print(
                "[contratar] No client_secret. subscription.status=",
                getattr(subscription, "status", None),
                " invoice keys=", inv_keys,
                " confirmation_secret=", getattr(invoice, "confirmation_secret", None) if invoice else None,
                " payment_intent=", getattr(invoice, "payment_intent", None) if invoice else None,
                flush=True,
            )
            raise HTTPException(
                status_code=500,
                detail=(
                    "No se pudo obtener el clientSecret del invoice de Stripe. "
                    f"sub.status={getattr(subscription, 'status', '?')} "
                    f"invoice_id={getattr(invoice, 'id', '?')}"
                ),
            )

        return {
            "clientSecret": client_secret,
            "subscriptionId": subscription.id,
            "customerId": customer.id,
        }

    except stripe.error.StripeError as e:
        msg = getattr(e, "user_message", None) or str(e)
        raise HTTPException(status_code=400, detail=msg)
