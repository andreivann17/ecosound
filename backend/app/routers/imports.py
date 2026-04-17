"""
Imports router.

Handles creation and retrieval of import batches and rejected rows.  The
actual file ingestion and processing can be handled externally and
integrated here by creating ``ImportBatch`` entries and adding
``CaseRecord`` rows.
"""

from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status,Response
from sqlalchemy.orm import Session

from ..security.auth import get_db, require_roles
from ..models.import_batch import ImportBatch
from ..models.import_rejection import ImportRejection
from ..schemas.import_batch import ImportBatchCreate, ImportBatchOut
from ..schemas.import_rejection import ImportRejectionOut

router = APIRouter(prefix="/imports", tags=["imports"])


@router.get("/", response_model=List[ImportBatchOut], dependencies=[Depends(require_roles("admin", "manager", "viewer"))])
def list_batches(db: Session = Depends(get_db)) -> Any:
    return db.query(ImportBatch).all()


@router.post("/", response_model=ImportBatchOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles("admin", "manager"))])
def create_batch(batch_in: ImportBatchCreate, db: Session = Depends(get_db)) -> Any:
    existing = db.query(ImportBatch).filter(ImportBatch.file_sha256 == batch_in.file_sha256).first()
    if existing:
        raise HTTPException(status_code=400, detail="Batch with this file already exists")
    batch = ImportBatch(
        client_name=batch_in.client_name,
        source=batch_in.source,
        original_filename=batch_in.original_filename,
        file_sha256=batch_in.file_sha256,
        file_size_bytes=batch_in.file_size_bytes,
        report_date=batch_in.report_date,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.get("/{batch_id}", response_model=ImportBatchOut, dependencies=[Depends(require_roles("admin", "manager", "viewer"))])
def get_batch(batch_id: int, db: Session = Depends(get_db)) -> Any:
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Import batch not found")
    return batch


@router.get("/{batch_id}/rejections", response_model=List[ImportRejectionOut], dependencies=[Depends(require_roles("admin", "manager", "viewer"))])
def list_rejections(batch_id: int, db: Session = Depends(get_db)) -> Any:
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Import batch not found")
    return batch.rejections


@router.delete("/{batch_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_roles("admin"))])
def delete_batch(batch_id: int, db: Session = Depends(get_db)) -> Response:
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Import batch not found")
    db.delete(batch)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)