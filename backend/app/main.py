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

import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from .db import init_pool 
from .routers.audit import router as audit_log_router
from .routers.agenda import router as agenda_router
from .routers.general import router as general_router
from .routers.notificaciones import router as notificaciones_router
from .routers.ws import router as ws_router
from .routers.eventos import router as eventos_router
from .routers.sesiones_fotos import router as sesiones_fotos_router
from .routers.estadisticas import router as estadisticas_router
from .routers.inventario import router as inventario_router
from .routers.trabajadores import router as trabajadores_router
from .routers.paquetes import router as paquetes_router
from .routers.gastos import router as gastos_router
from .routers.clientes import router as clientes_router
from .routers.avisos import router as avisos_router
from .routers.config_correo import router as config_correo_router
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

# ----- Global exception handler -----
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    from fastapi.exceptions import HTTPException
    from fastapi.exception_handlers import http_exception_handler
    if isinstance(exc, HTTPException):
        return await http_exception_handler(request, exc)
    desc = (
        f"[Backend Exception]\n"
        f"Path: {request.method} {request.url.path}\n\n"
        f"{traceback.format_exc()}"
    )
    from .utils.exceptions_logger import log_exception
    log_exception(desc, id_modulo=0, is_backend=True)
    return JSONResponse(status_code=500, content={"detail": "Error interno del servidor"})


# ----- CORS -----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://herrsoft.com", "https://www.herrsoft.com"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
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
        pass
    _seed_notificaciones_schema()
    _migrate_admin_db()
    _migrate_ecosound_db()
    from .utils.scheduler import start_reminder_scheduler
    start_reminder_scheduler()


def _seed_notificaciones_schema():
    """Ensure modulos, tipo_notificaciones exist and notificaciones has id_key column."""
    from .db import get_connection
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Add id_key column to notificaciones if missing
            cur.execute("""
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'notificaciones'
                  AND COLUMN_NAME = 'id_key'
            """)
            if cur.fetchone()[0] == 0:
                cur.execute("ALTER TABLE notificaciones ADD COLUMN id_key VARCHAR(64) DEFAULT NULL")

            # Seed modulos
            modulos = [
                (1, "Conciliaciones"),
                (2, "Eventos"),
                (3, "Sesiones de Fotos"),
                (4, "Paquetes"),
                (5, "Trabajadores"),
                (6, "Inventario"),
                (7, "Usuarios"),
                (8, "Clientes Events"),
                (9, "Gastos"),
            ]
            for id_m, nombre in modulos:
                cur.execute(
                    "INSERT IGNORE INTO modulos (id_modulo, nombre) VALUES (%s, %s)",
                    (id_m, nombre),
                )

            # Seed tipo_notificaciones
            tipos = [
                (1, "Creación"),
                (2, "Actualización"),
                (3, "Eliminación"),
            ]
            for id_t, nombre in tipos:
                cur.execute(
                    "INSERT IGNORE INTO tipo_notificaciones (id_tipo_notificacion, nombre) VALUES (%s, %s)",
                    (id_t, nombre),
                )

        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()

def _migrate_ecosound_db():
    """Ensure ecosound DB schema is up to date (users defaults, gastos table, etc.)."""
    from .db import get_connection
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Add correo_hora_sesion / correo_dia_sesion to configuracion_eventos if missing
            for _col in ("correo_hora_sesion", "correo_dia_sesion"):
                cur.execute("""
                    SELECT COUNT(*) FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'configuracion_eventos'
                      AND COLUMN_NAME = %s
                """, (_col,))
                if cur.fetchone()[0] == 0:
                    cur.execute(
                        f"ALTER TABLE configuracion_eventos ADD COLUMN {_col} TINYINT(1) NOT NULL DEFAULT 0"
                    )

            # Table to track which reminder emails have already been sent
            cur.execute("""
                CREATE TABLE IF NOT EXISTS recordatorios_correo_enviados (
                    id              INT AUTO_INCREMENT PRIMARY KEY,
                    id_evento       INT NOT NULL,
                    source_id       INT NOT NULL,
                    datetime_enviado DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_evento_src (id_evento, source_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)

            # Ensure configuracion_correos exists with source_id column
            cur.execute("""
                CREATE TABLE IF NOT EXISTS configuracion_correos (
                    id_configuracion_correo INT AUTO_INCREMENT PRIMARY KEY,
                    id_modulo   INT NOT NULL DEFAULT 0,
                    source_id   INT NOT NULL DEFAULT 0,
                    id_user_envio INT NOT NULL DEFAULT 0,
                    active      TINYINT(1) NOT NULL DEFAULT 1,
                    id_user     INT DEFAULT NULL,
                    datetime    DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_mod_src (id_modulo, source_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)
            # Add source_id column if table existed without it
            cur.execute("""
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'configuracion_correos'
                  AND COLUMN_NAME = 'source_id'
            """)
            if cur.fetchone()[0] == 0:
                cur.execute(
                    "ALTER TABLE configuracion_correos ADD COLUMN source_id INT NOT NULL DEFAULT 0 AFTER id_modulo"
                )
            # tipo_gastos catalog table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS tipo_gastos (
                    id_tipo_gasto   INT AUTO_INCREMENT PRIMARY KEY,
                    nombre          VARCHAR(125) NOT NULL,
                    active          TINYINT(1) NOT NULL DEFAULT 1,
                    id_cliente      INT DEFAULT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)

            # gastos main table (created fresh if missing)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS gastos (
                    id_gasto        INT AUTO_INCREMENT PRIMARY KEY,
                    descripcion     VARCHAR(255) NOT NULL,
                    monto           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                    fecha           DATE NOT NULL,
                    id_tipo_gasto   INT DEFAULT NULL,
                    id_user         INT DEFAULT NULL,
                    id_cliente      INT DEFAULT NULL,
                    active          TINYINT(1) NOT NULL DEFAULT 1,
                    active_sistema  TINYINT(1) NOT NULL DEFAULT 1,
                    datetime        DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_cliente (id_cliente),
                    INDEX idx_fecha (fecha),
                    INDEX idx_active_sistema (active_sistema)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)

            # add missing columns to gastos if table already existed without them
            _gastos_cols = [
                ("id_tipo_gasto",  "INT DEFAULT NULL"),
                ("notas",          "TEXT DEFAULT NULL"),
                ("filename",       "VARCHAR(125) DEFAULT NULL"),
                ("path",           "VARCHAR(255) DEFAULT NULL"),
                ("active_sistema", "TINYINT(1) NOT NULL DEFAULT 1"),
            ]
            for col_name, col_def in _gastos_cols:
                cur.execute("""
                    SELECT COUNT(*) FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'gastos'
                      AND COLUMN_NAME = %s
                """, (col_name,))
                if cur.fetchone()[0] == 0:
                    cur.execute(f"ALTER TABLE gastos ADD COLUMN {col_name} {col_def}")
            cur.execute("""
                SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'users'
                  AND COLUMN_NAME IN ('usuario_cliente', 'id_cliente')
            """)
            cols = {r[0]: {"nullable": r[1], "default": r[2]} for r in cur.fetchall()}
            if "usuario_cliente" in cols and cols["usuario_cliente"]["default"] is None:
                cur.execute(
                    "ALTER TABLE users MODIFY COLUMN usuario_cliente TINYINT(1) NOT NULL DEFAULT 0"
                )
            if "id_cliente" in cols:
                cur.execute(
                    "ALTER TABLE users MODIFY COLUMN id_cliente INT(11) DEFAULT NULL"
                )
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()


def _migrate_admin_db():
    """One-time migrations on the administrador database."""
    from .db import get_admin_connection
    conn = get_admin_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT DATA_TYPE FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'clientes'
                  AND COLUMN_NAME = 'celular'
            """)
            row = cur.fetchone()
            if row and row[0] in ("int", "bigint", "tinyint", "smallint", "mediumint"):
                cur.execute("ALTER TABLE clientes MODIFY COLUMN celular VARCHAR(20) DEFAULT NULL")

            cur.execute("""
                CREATE TABLE IF NOT EXISTS clientes_archivos (
                    id_archivo      INT AUTO_INCREMENT PRIMARY KEY,
                    id_cliente      INT NOT NULL,
                    id_app          INT NOT NULL DEFAULT 1,
                    tipo            VARCHAR(100) NOT NULL,
                    nombre_original VARCHAR(255),
                    nombre_almacenado VARCHAR(255) NOT NULL,
                    size_bytes      BIGINT DEFAULT 0,
                    active          TINYINT(1) NOT NULL DEFAULT 1,
                    id_user         INT,
                    datetime        DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_cliente_app (id_cliente, id_app)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()


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
app.include_router(inventario_router)
app.include_router(trabajadores_router)
app.include_router(paquetes_router)
app.include_router(gastos_router)
app.include_router(clientes_router)
app.include_router(avisos_router)
app.include_router(config_correo_router)
app.include_router(general_router)