"""
AuditLog schemas.

Model used to return audit log entries from the API.  These are
read-only.
"""

from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    action: str
    user_id: Optional[int] = None
    ip: Optional[bytes] = None
    before_json: Optional[Any] = None
    after_json: Optional[Any] = None
    created_at: datetime

    class Config:
        orm_mode = True