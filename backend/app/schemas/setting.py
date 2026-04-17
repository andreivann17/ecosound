"""
Setting schemas.

Provides models for reading and updating application settings.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SettingBase(BaseModel):
    skey: str
    svalue: str

    class Config:
        orm_mode = True


class SettingCreate(SettingBase):
    pass


class SettingUpdate(BaseModel):
    svalue: Optional[str] = None


class SettingOut(SettingBase):
    id: int
    updated_at: datetime