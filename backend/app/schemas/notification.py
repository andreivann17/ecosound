"""
Notification schemas.

Models for creating, updating and returning notifications.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NotificationBase(BaseModel):
    type: str
    level: str = "info"
    client_name: Optional[str] = None
    import_batch_id: Optional[int] = None
    message: str

    class Config:
        orm_mode = True


class NotificationCreate(NotificationBase):
    pass


class NotificationUpdate(BaseModel):
    level: Optional[str] = None
    message: Optional[str] = None
    client_name: Optional[str] = None
    import_batch_id: Optional[int] = None
    read_by_user_id: Optional[int] = None
    read_at: Optional[datetime] = None


class NotificationOut(NotificationBase):
    id: int
    created_at: datetime
    read_by_user_id: Optional[int] = None
    read_at: Optional[datetime] = None