import os, sys, time
sys.path.insert(0, ".")
from dotenv import load_dotenv
load_dotenv()
import stripe
from app.db import get_admin_connection

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
SUB_ID = "sub_1TfN3XAXPQeLqw7KxMk8k9l5"

seen = set()
last_flag = None
last_estado = None

print(f"[watch] vigilando suscripcion {SUB_ID} ... (Ctrl+C para salir)", flush=True)

while True:
    try:
        events = stripe.Event.list(type="customer.subscription.updated", limit=10)
        for e in events.data:
            obj = e.data.object
            if e.id not in seen and getattr(obj, "id", None) == SUB_ID:
                seen.add(e.id)
                cape = getattr(obj, "cancel_at_period_end", None)
                status = getattr(obj, "status", None)
                print(f"[stripe] evento {e.id} customer.subscription.updated -> cancel_at_period_end={cape} status={status}", flush=True)
    except Exception as exc:
        print(f"[stripe] error consultando eventos: {exc}", flush=True)

    try:
        conn = get_admin_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT cancel_at_period_end, suscripcion_estado FROM clientes WHERE stripe_subscription_id=%s",
            (SUB_ID,),
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row:
            if row["cancel_at_period_end"] != last_flag or row["suscripcion_estado"] != last_estado:
                last_flag = row["cancel_at_period_end"]
                last_estado = row["suscripcion_estado"]
                print(f"[db] clientes.cancel_at_period_end={last_flag} suscripcion_estado={last_estado}", flush=True)
    except Exception as exc:
        print(f"[db] error consultando: {exc}", flush=True)

    time.sleep(3)
