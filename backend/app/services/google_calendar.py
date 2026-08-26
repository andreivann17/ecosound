"""
Sincronización best-effort con Google Calendar vía Service Account.

Estrategia: un único calendario ("Agenda HerrSoft Events") propiedad de la
service account, compartido (lectura) con el correo de cada usuario activo en
`users`. Cada entrada de `agenda` (eventos, servicios, misa, etc.) se replica
ahí al crearse.

Nunca debe romper el flujo local: cualquier error de Google se registra y se
ignora — la agenda interna sigue siendo la fuente de verdad.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Optional

log = logging.getLogger("google_calendar")

_SCOPES = ["https://www.googleapis.com/auth/calendar"]
_CALENDAR_SUMMARY = "Agenda HerrSoft Events"
_TIMEZONE = "America/Hermosillo"

_CREDENTIALS_PATH = Path(__file__).resolve().parents[2] / "secrets" / "google-calendar-service-account.json"

_service = None
_calendar_id_cache: Optional[str] = None


def _get_service():
    global _service
    if _service is not None:
        return _service
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        if not _CREDENTIALS_PATH.exists():
            log.warning("google_calendar: no se encontró %s — integración desactivada", _CREDENTIALS_PATH)
            return None

        creds = service_account.Credentials.from_service_account_file(
            str(_CREDENTIALS_PATH), scopes=_SCOPES
        )
        _service = build("calendar", "v3", credentials=creds, cache_discovery=False)
        return _service
    except Exception:
        log.exception("google_calendar: no se pudo inicializar el cliente")
        return None


def _get_or_create_calendar_id(service) -> Optional[str]:
    global _calendar_id_cache
    if _calendar_id_cache:
        return _calendar_id_cache
    try:
        page_token = None
        while True:
            resp = service.calendarList().list(pageToken=page_token).execute()
            for cal in resp.get("items", []):
                if cal.get("summary") == _CALENDAR_SUMMARY:
                    _calendar_id_cache = cal["id"]
                    return _calendar_id_cache
            page_token = resp.get("nextPageToken")
            if not page_token:
                break

        created = service.calendars().insert(
            body={"summary": _CALENDAR_SUMMARY, "timeZone": _TIMEZONE}
        ).execute()
        _calendar_id_cache = created["id"]
        log.info("google_calendar: calendario creado id=%s", _calendar_id_cache)
        return _calendar_id_cache
    except Exception:
        log.exception("google_calendar: no se pudo obtener/crear el calendario")
        return None


def _get_gmail_emails() -> List[str]:
    """Correos de `users.email` (activos, no vacíos) — únicos destinatarios del calendario."""
    from ..db import get_connection

    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT email FROM users "
                "WHERE active = 1 AND email IS NOT NULL AND email != ''"
            )
            return [r["email"] for r in cur.fetchall()]
    finally:
        conn.close()


def sync_all_gmail_users() -> None:
    """Comparte el calendario con todos los correos activos de `users`."""
    try:
        emails = _get_gmail_emails()
    except Exception:
        log.exception("google_calendar: no se pudo leer email de users")
        return
    sync_shared_users(emails)


def sync_shared_users(emails: List[str]) -> None:
    """Comparte (lectura) el calendario con cada correo. Idempotente, best-effort."""
    service = _get_service()
    if not service:
        return
    calendar_id = _get_or_create_calendar_id(service)
    if not calendar_id:
        return

    try:
        existing = set()
        page_token = None
        while True:
            resp = service.acl().list(calendarId=calendar_id, pageToken=page_token).execute()
            for rule in resp.get("items", []):
                scope = rule.get("scope", {})
                if scope.get("type") == "user" and scope.get("value"):
                    existing.add(scope["value"].lower())
            page_token = resp.get("nextPageToken")
            if not page_token:
                break
    except Exception:
        log.exception("google_calendar: no se pudo leer el ACL actual")
        return

    for email in emails:
        email = (email or "").strip()
        if not email or email.lower() in existing:
            continue
        try:
            service.acl().insert(
                calendarId=calendar_id,
                body={"role": "reader", "scope": {"type": "user", "value": email}},
            ).execute()
            log.info("google_calendar: calendario compartido con %s", email)
        except Exception:
            log.exception("google_calendar: no se pudo compartir con %s", email)


def create_event(
    *,
    title: str,
    start_at,
    end_at,
    location: Optional[str] = None,
    description: Optional[str] = None,
) -> Optional[str]:
    """Crea el evento en el calendario compartido. Devuelve el google_event_id o None si falla."""
    service = _get_service()
    if not service:
        return None
    calendar_id = _get_or_create_calendar_id(service)
    if not calendar_id:
        return None
    try:
        body = {
            "summary": title or "(Sin título)",
            "location": location or "",
            "description": description or "",
            "start": {"dateTime": start_at.isoformat(), "timeZone": _TIMEZONE},
            "end": {"dateTime": end_at.isoformat(), "timeZone": _TIMEZONE},
        }
        created = service.events().insert(calendarId=calendar_id, body=body).execute()
        return created.get("id")
    except Exception:
        log.exception("google_calendar: no se pudo crear el evento '%s'", title)
        return None


def update_event(
    google_event_id: str,
    *,
    title: Optional[str] = None,
    start_at=None,
    end_at=None,
    location: Optional[str] = None,
    description: Optional[str] = None,
) -> bool:
    service = _get_service()
    if not service or not google_event_id:
        return False
    calendar_id = _get_or_create_calendar_id(service)
    if not calendar_id:
        return False
    try:
        body = {}
        if title is not None:
            body["summary"] = title
        if location is not None:
            body["location"] = location
        if description is not None:
            body["description"] = description
        if start_at is not None:
            body["start"] = {"dateTime": start_at.isoformat(), "timeZone": _TIMEZONE}
        if end_at is not None:
            body["end"] = {"dateTime": end_at.isoformat(), "timeZone": _TIMEZONE}
        service.events().patch(calendarId=calendar_id, eventId=google_event_id, body=body).execute()
        return True
    except Exception:
        log.exception("google_calendar: no se pudo actualizar el evento %s", google_event_id)
        return False


def delete_event(google_event_id: str) -> bool:
    service = _get_service()
    if not service or not google_event_id:
        return False
    calendar_id = _get_or_create_calendar_id(service)
    if not calendar_id:
        return False
    try:
        service.events().delete(calendarId=calendar_id, eventId=google_event_id).execute()
        return True
    except Exception:
        log.exception("google_calendar: no se pudo eliminar el evento %s", google_event_id)
        return False
