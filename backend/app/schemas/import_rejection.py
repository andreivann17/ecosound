"""
ImportRejection schemas.

These models are used for returning information about rejected rows in
an import batch.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ImportRejectionOut(BaseModel):
    id: int
    import_batch_id: int
    source_row_no: int
    expediente: Optional[str] = None
    reason: str
    created_at: datetime
    created_by_user_id: Optional[int] = None

    class Config:
        orm_mode = True