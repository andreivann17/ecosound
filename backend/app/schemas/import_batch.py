"""
ImportBatch schemas.

Defines the shape of requests and responses for import batch
operations.  ``ImportBatchOut`` includes the counts of imported and
rejected rows, while ``ImportBatchSummary`` aggregates totals for
reporting purposes.
"""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class ImportBatchBase(BaseModel):
    client_name: Optional[str] = None
    source: str = "manual"
    original_filename: str
    file_sha256: str
    file_size_bytes: Optional[int] = None
    report_date: Optional[date] = None

    class Config:
        orm_mode = True


class ImportBatchCreate(ImportBatchBase):
    pass


class ImportBatchOut(ImportBatchBase):
    id: int
    rows_total: int
    rows_imported: int
    rows_rejected: int
    created_at: datetime
    updated_at: Optional[datetime] = None


class ImportBatchSummary(BaseModel):
    total_batches: int
    total_records: int
    total_rejections: int