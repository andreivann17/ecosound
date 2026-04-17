"""
File schemas.

Defines the representation of file metadata returned by the API.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class FileOut(BaseModel):
    id: int
    import_batch_id: int
    storage_path: str
    original_filename: str
    mime_type: Optional[str] = None
    file_sha256: str
    size_bytes: Optional[int] = None
    created_at: datetime

    class Config:
        orm_mode = True