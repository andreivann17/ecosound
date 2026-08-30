"""
Servicio independiente del módulo Evaluation (evaluación de imágenes
retinales).

A propósito corre como su PROPIO proceso, separado por completo del
backend de HerrSoft Events (app/main.py). No comparte startup, no
comparte lifecycle: si la base `spie` no está disponible en un entorno
(o cualquier otra cosa falla aquí adentro), este proceso puede
degradarse o caerse sin afectar jamás a HerrSoft Events.

Correr en local:
    uvicorn app.evaluation_server:app --host 0.0.0.0 --port 8001 --reload
o:
    python -m app.evaluation_server
"""
from __future__ import annotations

import os
import traceback
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

from fastapi import FastAPI, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .db import get_spie_connection
from .routers.evaluation import router as evaluation_router

app = FastAPI(title="Evaluation API", version="1.0.0")


EXPOSE_ERROR_DETAILS = os.getenv("EVALUATION_EXPOSE_ERRORS", "1") == "1"


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return await http_exception_handler(request, exc)
    traceback.print_exc()
    detail = "Internal server error"
    if EXPOSE_ERROR_DETAILS:
        detail = f"Internal server error: {type(exc).__name__}: {exc}"
    return JSONResponse(status_code=500, content={"detail": detail})


app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://herrsoft.com", "https://www.herrsoft.com"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = Path(os.getenv("EVALUATION_UPLOADS_DIR", str(BASE_DIR / "uploads")))
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


def _migrate_spie_db() -> None:
    """Crea/actualiza las tablas de la base spie.

    Nunca lanza: si la base no está disponible en este entorno, el
    servicio de Evaluation sigue vivo (las rutas fallarán
    individualmente con 500, pero el proceso no muere).
    """
    try:
        conn = get_spie_connection()
    except Exception:
        return
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


@app.on_event("startup")
def on_startup():
    try:
        _migrate_spie_db()
    except Exception:
        pass


app.include_router(evaluation_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.evaluation_server:app",
        host="0.0.0.0",
        port=int(os.getenv("EVALUATION_PORT", "8001")),
        reload=True,
    )
