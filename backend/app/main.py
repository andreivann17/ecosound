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
import threading

# Cargar variables de entorno desde .env (solo afecta dev local; en Docker
# las vars vienen de env_file). Tiene que ir ANTES de importar routers que
# leen env vars al cargar el módulo (ej. contratar.STRIPE_SECRET_KEY).
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

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
from .routers.cotizaciones import router as cotizaciones_router
from .routers.informes import router as informes_router
from .routers.sesiones_fotos import router as sesiones_fotos_router
from .routers.estadisticas import router as estadisticas_router
from .routers.inventario import router as inventario_router
from .routers.trabajadores import router as trabajadores_router
from .routers.paquetes import router as paquetes_router
from .routers.gastos import router as gastos_router
from .routers.clientes import router as clientes_router
from .routers.avisos import router as avisos_router
from .routers.config_correo import router as config_correo_router
from .routers.contacto import router as contacto_router
from .routers.contratar import router as contratar_router
from .routers.configuracion_diseno import router as configuracion_diseno_router
from .routers.evaluation import router as evaluation_router
from .services import google_calendar
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
    _migrate_cotizaciones_db()
    _migrate_spie_db()
    from .utils.scheduler import start_reminder_scheduler
    start_reminder_scheduler()

    def _sync_google_calendar_users():
        try:
            google_calendar.sync_all_gmail_users()
        except Exception:
            pass

    threading.Thread(target=_sync_google_calendar_users, daemon=True).start()


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
                (10, "Cotizaciones"),
                (11, "Informes"),
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
            # eventos_servicios — asegurar que id_cliente permite NULL
            # (cotizaciones_servicios ya lo tiene como DEFAULT NULL)
            cur.execute("""
                SELECT IS_NULLABLE FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'eventos_servicios'
                  AND COLUMN_NAME = 'id_cliente'
            """)
            _r = cur.fetchone()
            if _r and _r[0] == 'NO':
                cur.execute("ALTER TABLE eventos_servicios MODIFY COLUMN id_cliente INT DEFAULT NULL")

            # eventos_servicios — asegurar que existan las columnas hora_inicio/hora_final
            # como TIME (en algún punto las dejaron como TIMESTAMP/INT y eso impide
            # guardar correctamente las horas del servicio).
            cur.execute("""
                SELECT DATA_TYPE FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'eventos_servicios'
                  AND COLUMN_NAME = 'hora_inicio'
            """)
            _r = cur.fetchone()
            if _r and _r[0] not in ('time',):
                cur.execute("ALTER TABLE eventos_servicios MODIFY COLUMN hora_inicio TIME DEFAULT NULL")
            cur.execute("""
                SELECT DATA_TYPE FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'eventos_servicios'
                  AND COLUMN_NAME = 'hora_final'
            """)
            _r = cur.fetchone()
            if _r and _r[0] not in ('time',):
                cur.execute("ALTER TABLE eventos_servicios MODIFY COLUMN hora_final TIME DEFAULT NULL")

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

            # google_event_id en agenda — enlaza cada entrada con su evento en Google Calendar
            cur.execute("""
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'agenda'
                  AND COLUMN_NAME = 'google_event_id'
            """)
            if cur.fetchone()[0] == 0:
                cur.execute("ALTER TABLE agenda ADD COLUMN google_event_id VARCHAR(255) DEFAULT NULL")

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
            # Asegurar id_cliente en paquetes_decoraciones y paquetes_barra
            for _tbl in ("paquetes_decoraciones", "paquetes_barra"):
                cur.execute("""
                    SELECT COUNT(*) FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = %s
                      AND COLUMN_NAME = 'id_cliente'
                """, (_tbl,))
                if cur.fetchone()[0] == 0:
                    cur.execute(f"ALTER TABLE `{_tbl}` ADD COLUMN id_cliente INT DEFAULT NULL")

            # Asegurar columnas id_cliente y usuario_cliente en users
            _users_extra_cols = [
                ("id_cliente",      "INT DEFAULT NULL"),
                ("usuario_cliente", "TINYINT(1) NOT NULL DEFAULT 0"),
            ]
            for col_name, col_def in _users_extra_cols:
                cur.execute("""
                    SELECT COUNT(*) FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'users'
                      AND COLUMN_NAME = %s
                """, (col_name,))
                if cur.fetchone()[0] == 0:
                    cur.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")

            # Tabla de configuración de diseño (layout horizontal/vertical) por usuario
            cur.execute("""
                CREATE TABLE IF NOT EXISTS configuracion_diseno (
                    id_configuracion_diseno INT AUTO_INCREMENT PRIMARY KEY,
                    is_vertical TINYINT(1) NOT NULL DEFAULT 0,
                    id_user INT NOT NULL,
                    active TINYINT(1) NOT NULL DEFAULT 1,
                    datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_user (id_user)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)

            # Tabla de privilegios por usuario/módulo
            cur.execute("""
                CREATE TABLE IF NOT EXISTS usuarios_privilegios (
                    id_privilegio   INT AUTO_INCREMENT PRIMARY KEY,
                    id_user         INT NOT NULL,
                    id_modulo       INT NOT NULL,
                    modulo          TINYINT(1) NOT NULL DEFAULT 1,
                    consultar       TINYINT(1) NOT NULL DEFAULT 1,
                    insertar        TINYINT(1) NOT NULL DEFAULT 1,
                    editar          TINYINT(1) NOT NULL DEFAULT 1,
                    eliminar        TINYINT(1) NOT NULL DEFAULT 1,
                    active          TINYINT(1) NOT NULL DEFAULT 1,
                    datetime        DATETIME DEFAULT CURRENT_TIMESTAMP,
                    id_user_created INT DEFAULT NULL,
                    UNIQUE KEY uq_user_modulo (id_user, id_modulo),
                    INDEX idx_user (id_user)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)
            # Si la tabla ya existía con id_user_created NOT NULL, hacerla nullable
            cur.execute("""
                SELECT IS_NULLABLE FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME   = 'usuarios_privilegios'
                  AND COLUMN_NAME  = 'id_user_created'
            """)
            _r = cur.fetchone()
            if _r and _r[0] == "NO":
                cur.execute(
                    "ALTER TABLE usuarios_privilegios "
                    "MODIFY COLUMN id_user_created INT DEFAULT NULL"
                )
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()


def _migrate_cotizaciones_db():
    """Crea las tablas propias del modulo Cotizaciones (clon de eventos/contratos).

    Usa CREATE TABLE IF NOT EXISTS, igual que el resto de migraciones de arranque,
    para no requerir migraciones manuales en MySQL.
    """
    from .db import get_connection
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS cotizaciones (
                    id_cotizacion           INT AUTO_INCREMENT PRIMARY KEY,
                    folio                   VARCHAR(20) DEFAULT NULL,
                    estado                  VARCHAR(20) NOT NULL DEFAULT 'pendiente',
                    id_user                 INT DEFAULT NULL,
                    id_tipo_evento          INT DEFAULT NULL,
                    cliente_nombre          VARCHAR(255) DEFAULT NULL,
                    domicilio               VARCHAR(255) DEFAULT NULL,
                    celular                 VARCHAR(30)  DEFAULT NULL,
                    fecha_evento            DATETIME DEFAULT NULL,
                    lugar_evento            VARCHAR(255) DEFAULT NULL,
                    hora_inicio             DATETIME DEFAULT NULL,
                    hora_final              DATETIME DEFAULT NULL,
                    importe                 VARCHAR(50)  DEFAULT NULL,
                    id_ciudad               INT DEFAULT NULL,
                    fecha_anticipo          DATETIME DEFAULT NULL,
                    importe_anticipo        VARCHAR(50)  DEFAULT NULL,
                    comentarios             TEXT DEFAULT NULL,
                    direccion_misa          VARCHAR(255) DEFAULT NULL,
                    hora_misa               DATETIME DEFAULT NULL,
                    id_paquete_sonido       INT DEFAULT NULL,
                    id_paquete_fotografia   INT DEFAULT NULL,
                    id_ciudad_fotografia    INT DEFAULT NULL,
                    lugar_fotografia        VARCHAR(255) DEFAULT NULL,
                    datetime_fotografia     DATETIME DEFAULT NULL,
                    comentarios_fotografia  TEXT DEFAULT NULL,
                    fecha_creacion_contrato DATETIME DEFAULT NULL,
                    id_agenda               INT DEFAULT NULL,
                    datetime                DATETIME DEFAULT CURRENT_TIMESTAMP,
                    code                    VARCHAR(20)  DEFAULT NULL,
                    id_cliente              INT DEFAULT NULL,
                    active                  TINYINT(1) NOT NULL DEFAULT 1,
                    INDEX idx_cliente (id_cliente),
                    INDEX idx_fecha (fecha_evento),
                    INDEX idx_active (active)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS cotizaciones_servicios (
                    id_cotizacion_servicio INT AUTO_INCREMENT PRIMARY KEY,
                    id_cotizacion   INT NOT NULL,
                    fecha_evento    DATETIME DEFAULT NULL,
                    hora_inicio     TIME DEFAULT NULL,
                    hora_final      TIME DEFAULT NULL,
                    lugar           VARCHAR(255) DEFAULT NULL,
                    id_paquete      INT DEFAULT NULL,
                    datetime        DATETIME DEFAULT CURRENT_TIMESTAMP,
                    id_user         INT DEFAULT NULL,
                    id_cliente      INT DEFAULT NULL,
                    id_ciudad       INT DEFAULT NULL,
                    comentarios     TEXT DEFAULT NULL,
                    id_servicio     INT DEFAULT NULL,
                    INDEX idx_cotizacion (id_cotizacion)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS cotizaciones_abonos (
                    id_cotizacion_abono INT AUTO_INCREMENT PRIMARY KEY,
                    importe       VARCHAR(50) DEFAULT NULL,
                    fecha         DATETIME DEFAULT NULL,
                    active        TINYINT(1) NOT NULL DEFAULT 1,
                    id_user       INT DEFAULT NULL,
                    id_cotizacion INT NOT NULL,
                    id_cliente    INT DEFAULT NULL,
                    INDEX idx_cotizacion (id_cotizacion)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS cotizaciones_equipos (
                    id_cotizacion_equipo INT AUTO_INCREMENT PRIMARY KEY,
                    id_cotizacion      INT NOT NULL,
                    id_equipo          INT NOT NULL,
                    cantidad           INT NOT NULL DEFAULT 1,
                    fecha_salida       DATETIME DEFAULT NULL,
                    fecha_regreso      DATETIME DEFAULT NULL,
                    regreso_confirmado TINYINT(1) NOT NULL DEFAULT 0,
                    descripcion        VARCHAR(255) DEFAULT NULL,
                    datetime           DATETIME DEFAULT CURRENT_TIMESTAMP,
                    id_cliente         INT DEFAULT NULL,
                    INDEX idx_cotizacion (id_cotizacion),
                    INDEX idx_equipo (id_equipo)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS cotizaciones_documentos (
                    id_contacto_documento INT AUTO_INCREMENT PRIMARY KEY,
                    id_cotizacion     INT NOT NULL,
                    active            TINYINT(1) NOT NULL DEFAULT 1,
                    filename          VARCHAR(255) DEFAULT NULL,
                    path              VARCHAR(500) DEFAULT NULL,
                    id_user           INT DEFAULT NULL,
                    id_tipo_documento INT NOT NULL DEFAULT 1,
                    datetime          DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_cotizacion (id_cotizacion)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS cotizaciones_trabajadores (
                    id_cotizacion_trabajador INT AUTO_INCREMENT PRIMARY KEY,
                    id_cotizacion  INT NOT NULL,
                    id_trabajador  INT NOT NULL,
                    id_puesto      INT DEFAULT NULL,
                    active         TINYINT(1) NOT NULL DEFAULT 1,
                    datetime       DATETIME DEFAULT CURRENT_TIMESTAMP,
                    id_user        INT DEFAULT NULL,
                    id_cliente     INT DEFAULT NULL,
                    INDEX idx_cotizacion (id_cotizacion)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)

            # Agregar columna `folio` si la tabla ya existía sin ella
            cur.execute("""
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'cotizaciones'
                  AND COLUMN_NAME = 'folio'
            """)
            if cur.fetchone()[0] == 0:
                cur.execute("ALTER TABLE cotizaciones ADD COLUMN folio VARCHAR(20) DEFAULT NULL AFTER id_cotizacion")

            # Agregar columna `estado` (pendiente/aceptada/rechazada) si falta
            cur.execute("""
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'cotizaciones'
                  AND COLUMN_NAME = 'estado'
            """)
            if cur.fetchone()[0] == 0:
                cur.execute("ALTER TABLE cotizaciones ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' AFTER folio")

            cur.execute("""
                CREATE TABLE IF NOT EXISTS contacto (
                    id_contacto   INT AUTO_INCREMENT PRIMARY KEY,
                    responsable   VARCHAR(150) NOT NULL,
                    empresa       VARCHAR(150) DEFAULT NULL,
                    correo        VARCHAR(150) NOT NULL,
                    celular       VARCHAR(30)  NOT NULL,
                    direccion     VARCHAR(255) DEFAULT NULL,
                    zona          VARCHAR(100) DEFAULT NULL,
                    mensaje       TEXT DEFAULT NULL,
                    via           VARCHAR(20)  NOT NULL DEFAULT 'correo',
                    is_correo     TINYINT(1)   NOT NULL DEFAULT 0,
                    is_whatsapp   TINYINT(1)   NOT NULL DEFAULT 0,
                    ip            VARCHAR(60)  DEFAULT NULL,
                    active        TINYINT(1)   NOT NULL DEFAULT 1,
                    datetime      DATETIME     DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()


def _migrate_spie_db():
    """Crea/actualiza las tablas de la base spie (módulo Evaluation)."""
    from .db import get_spie_connection
    conn = get_spie_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS retinal_images (
                    id_retinal_image INT AUTO_INCREMENT PRIMARY KEY,
                    name         TEXT NOT NULL,
                    hidden_name  TEXT NOT NULL,
                    is_real      TINYINT(1) NOT NULL,
                    stage        VARCHAR(50) NOT NULL,
                    active       TINYINT(1) NOT NULL DEFAULT 1,
                    datetime     DATETIME NOT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS evaluators (
                    id_evaluator INT AUTO_INCREMENT PRIMARY KEY,
                    name         TEXT NOT NULL,
                    active       TINYINT(1) NOT NULL DEFAULT 1,
                    datetime     DATETIME NOT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)

            # Login del evaluador: email/password no existían en la tabla original
            for col_name, col_def in [
                ("email",    "VARCHAR(255) DEFAULT NULL"),
                ("password", "VARCHAR(255) DEFAULT NULL"),
            ]:
                cur.execute("""
                    SELECT COUNT(*) FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'evaluators'
                      AND COLUMN_NAME = %s
                """, (col_name,))
                if cur.fetchone()[0] == 0:
                    cur.execute(f"ALTER TABLE evaluators ADD COLUMN {col_name} {col_def}")

            cur.execute("""
                SELECT COUNT(*) FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'evaluators'
                  AND INDEX_NAME = 'uq_evaluators_email'
            """)
            if cur.fetchone()[0] == 0:
                cur.execute("ALTER TABLE evaluators ADD UNIQUE INDEX uq_evaluators_email (email)")

            cur.execute("""
                CREATE TABLE IF NOT EXISTS evaluations (
                    id_evaluation    INT AUTO_INCREMENT PRIMARY KEY,
                    active           TINYINT(1) NOT NULL DEFAULT 1,
                    datetime         DATETIME NOT NULL,
                    id_retinal_image INT NOT NULL,
                    classification   VARCHAR(50) NOT NULL,
                    notes            TEXT NOT NULL,
                    evaluated_at     DATETIME NOT NULL,
                    id_evaluator     INT NOT NULL,
                    id_user          INT NOT NULL,
                    INDEX idx_retinal_image (id_retinal_image),
                    INDEX idx_evaluator (id_evaluator)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)
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

            cur.execute("""
                CREATE TABLE IF NOT EXISTS registros_incompletos (
                    id_registro_incompleto INT AUTO_INCREMENT PRIMARY KEY,
                    correo    VARCHAR(225) NOT NULL,
                    nombre    VARCHAR(225) NOT NULL,
                    empresa   VARCHAR(125) NOT NULL DEFAULT '',
                    datetime  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    password  VARBINARY(255) NOT NULL,
                    active    TINYINT(1)   NOT NULL DEFAULT 1,
                    INDEX idx_correo_active (correo, active)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)

            # Permitir NULL en columnas id_user de tablas del administrador
            # para soportar registros de auto-servicio (sin usuario admin creador)
            _nullable_cols = [
                ("clientes",      "id_user",          "INT DEFAULT NULL"),
                ("apps_clientes", "id_user",          "INT DEFAULT NULL"),
                ("users",         "id_user_creation", "INT DEFAULT NULL"),
            ]
            for table, col, definition in _nullable_cols:
                cur.execute("""
                    SELECT IS_NULLABLE FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME   = %s
                      AND COLUMN_NAME  = %s
                """, (table, col))
                row2 = cur.fetchone()
                if row2 and row2[0] == "NO":
                    cur.execute(
                        f"ALTER TABLE `{table}` MODIFY COLUMN `{col}` {definition}"
                    )

            # Asegurar columnas id_cliente y usuario_cliente en administrador.users
            for col_name, col_def in [
                ("id_cliente",      "INT DEFAULT NULL"),
                ("usuario_cliente", "TINYINT(1) NOT NULL DEFAULT 0"),
            ]:
                cur.execute("""
                    SELECT COUNT(*) FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'users'
                      AND COLUMN_NAME = %s
                """, (col_name,))
                if cur.fetchone()[0] == 0:
                    cur.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")

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
app.include_router(cotizaciones_router)
app.include_router(informes_router)
app.include_router(sesiones_fotos_router)
app.include_router(estadisticas_router)
app.include_router(inventario_router)
app.include_router(trabajadores_router)
app.include_router(paquetes_router)
app.include_router(gastos_router)
app.include_router(clientes_router)
app.include_router(avisos_router)
app.include_router(config_correo_router)
app.include_router(contacto_router)
app.include_router(contratar_router)
app.include_router(general_router)
app.include_router(configuracion_diseno_router)
app.include_router(evaluation_router)