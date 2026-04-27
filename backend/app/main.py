"""
Entry point for the FastAPI application.

- Configura CORS y healthcheck.
- Inicializa el pool de MySQL (init_pool).
- Crea tablas con SQLAlchemy al arrancar (Base.metadata.create_all).
- Registra TUS routers.
- Inyecta SecurityScheme HTTP Bearer en OpenAPI para que aparezca "Authorize" en Swagger.
"""

from __future__ import annotations
from pathlib import Path
import os
from .utils.clean_temp_models import clean_temp_models

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.staticfiles import StaticFiles
from .db import init_pool 
from .routers.audit import router as audit_log_router
from .routers.agenda import router as agenda_router
from .routers.notificaciones import router as notificaciones_router
from .routers.ws import router as ws_router
from .routers.eventos import router as eventos_router
from .routers.sesiones_fotos import router as sesiones_fotos_router
from .routers.estadisticas import router as estadisticas_router
# Routers (solo los tuyos)
from .routers import (
    auth,
    users,

)
import uvicorn
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

# ----- App -----
app = FastAPI(title="Legal Expedients API", version="1.0.0", openapi_url="/openapi.json")

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR = Path(os.getenv("UPLOADS_DIR", str(DEFAULT_UPLOADS_DIR)))
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# ----- CORS -----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"], 
    expose_headers=["Authorization"],
)

# ----- Healthcheck -----
@app.get("/healthz")
def healthz():
    return {"status": "ok"}

# ----- Startup: init_pool + create tables -----
@app.on_event("startup")
def on_startup():
    init_pool()
    try:
        clean_temp_models()
    except Exception:
        # No romper arranque por problemas de FS
        pass

# ----- Swagger: agrega el esquema Bearer para mostrar "Authorize" -----
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description="API para expedientes legales",
        routes=app.routes,
    )
    components = schema.setdefault("components", {})
    ss = components.setdefault("securitySchemes", {})
    ss.setdefault("HTTPBearer", {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"})
    app.openapi_schema = schema
    return app.openapi_schema

app.openapi = custom_openapi

# Static files (opcional)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# ----- Include Routers (solo APIRouter, sin .router) -----
app.include_router(auth)
app.include_router(users)
app.include_router(audit_log_router)
app.include_router(agenda_router)
app.include_router(ws_router)
app.include_router(notificaciones_router)
app.include_router(eventos_router)
app.include_router(sesiones_fotos_router)
app.include_router(estadisticas_router)