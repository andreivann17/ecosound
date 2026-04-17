"""
Files router.

Provides simple CRUD operations for file metadata.  Actual file
contents must be handled separately (e.g., storing uploads on disk
and saving the path here).  Only admins and managers may create or
delete files.
"""

from typing import Any, List, Optional


from fastapi import APIRouter, Depends,UploadFile, HTTPException, status,Response, File as Filefastapi
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse
import pandas as pd
from pathlib import Path
import os
from datetime import datetime
from ..security.auth import get_db, require_roles
from ..models.file import File 
from ..schemas.file import FileOut
from ..database.expedientes import import_excel_to_db

router = APIRouter(prefix="/files", tags=["files"])

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/", response_model=List[FileOut], dependencies=[Depends(require_roles("admin", "manager", "viewer"))])
def list_files(db: Session = Depends(get_db)) -> Any:
    return db.query(File).all()


@router.post("/", response_model=FileOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles("admin", "manager"))])
def create_file(
    import_batch_id: int,
    storage_path: str,
    original_filename: str,
    mime_type: Optional[str] = None,
    file_sha256: str | None = None,
    size_bytes: Optional[int] = None,
    db: Session = Depends(get_db),
) -> Any:
    if file_sha256:
        existing = db.query(File).filter(File.file_sha256 == file_sha256).first()
        if existing:
            raise HTTPException(status_code=400, detail="File already exists")
    file = File(
        import_batch_id=import_batch_id,
        storage_path=storage_path,
        original_filename=original_filename,
        mime_type=mime_type,
        file_sha256=file_sha256 or "",
        size_bytes=size_bytes,
    )
    db.add(file)
    db.commit()
    db.refresh(file)
    return file


@router.get("/{file_id}", response_model=FileOut, dependencies=[Depends(require_roles("admin", "manager", "viewer"))])
def get_file(file_id: int, db: Session = Depends(get_db)) -> Any:
    file = db.query(File).filter(File.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return file


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_roles("admin"))])
def delete_file(file_id: int, db: Session = Depends(get_db)) -> Response:
    file = db.query(File).filter(File.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    db.delete(file)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/upload", status_code=200)
async def upload_excel_file(file: UploadFile = Filefastapi(...)):
    """
    Recibe un archivo Excel o CSV desde React,
    lo guarda temporalmente en /uploads/, lo procesa con pandas
    y guarda los resultados en MySQL (tabla expediente).
    Devuelve un resumen JSON.
    """

    # Validar tipo de archivo
    filename = file.filename  # ✅ CORREGIDO
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".xlsx", ".xls", ".csv"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se aceptan archivos Excel (.xlsx, .xls) o CSV."
        )

    # Guardar archivo temporalmente
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    temp_path = UPLOAD_DIR / f"{timestamp}_{filename}"

    try:
        with open(temp_path, "wb") as buffer:
            buffer.write(await file.read())

        # Leer el archivo con pandas
        if ext == ".csv":
            df = pd.read_csv(temp_path)
        else:
            df = pd.read_excel(temp_path)

        df = df.fillna("")  # Limpieza básica
        data = df.to_dict(orient="records")

        # === Importar a MySQL ===
        result = import_excel_to_db(str(temp_path))

        # Respuesta completa
        return JSONResponse(
            content={
                "message": "Archivo procesado e importado exitosamente.",
                "db_result": result,
                "columns": list(df.columns),
                "preview": data[:5],  # primeras filas
                "total_rows": len(df)
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar el archivo: {e}")

    finally:
        # Limpieza del archivo temporal
        if os.path.exists(temp_path):
            os.remove(temp_path)

    """
    Recibe un archivo Excel o CSV desde React,
    lo guarda temporalmente en /uploads/, lo procesa con pandas
    y devuelve su contenido limpio en formato JSON.
    """

    # Verificar tipo de archivo
    filename = Filefastapi.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".xlsx", ".xls", ".csv"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se aceptan archivos Excel (.xlsx, .xls) o CSV."
        )

    # Guardar archivo temporalmente
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    temp_path = UPLOAD_DIR / f"{timestamp}_{filename}"

    with open(temp_path, "wb") as buffer:
        buffer.write(await file.read())

    try:
        df = pd.read_excel(temp_path)
        df = df.fillna("")
        data = df.to_dict(orient="records")

        # === NUEVO: importar a MySQL ===
        result = import_excel_to_db(str(temp_path))

        return {
            "message": "Archivo procesado e importado exitosamente.",
            "db_result": result,
            "preview": data[:5]  # muestra las primeras filas al frontend
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar el archivo: {e}")

    finally:
        os.remove(temp_path)