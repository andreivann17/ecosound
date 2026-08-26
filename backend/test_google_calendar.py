"""
Prueba aislada de la integración con Google Calendar.
Correr con: python test_google_calendar.py
"""
from app.services import google_calendar as gc

print("1) Inicializando cliente...")
service = gc._get_service()
print("   service:", "OK" if service else "FALLÓ (revisa el path del JSON)")

if service:
    print("2) Obteniendo/creando calendario...")
    cal_id = gc._get_or_create_calendar_id(service)
    print("   calendar_id:", cal_id)

    print("3) Leyendo email de users y compartiendo...")
    emails = gc._get_gmail_emails()
    print("   correos encontrados:", emails)
    gc.sync_shared_users(emails)
    print("   listo (revisa arriba si hubo error)")

    print("4) Creando evento de prueba...")
    from datetime import datetime, timedelta
    start = datetime.now() + timedelta(hours=1)
    end = start + timedelta(hours=1)
    event_id = gc.create_event(
        title="PRUEBA - HerrSoft Agenda",
        start_at=start,
        end_at=end,
        location="Oficina",
        description="Evento de prueba de la integración",
    )
    print("   google_event_id:", event_id)
