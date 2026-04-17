"""
Status code schemas.

These models define the payloads accepted and returned by the status
code endpoints.  The ``StatusCodeOut`` model includes the primary
identifier and timestamps, while ``StatusCodeCreate`` and
``StatusCodeUpdate`` capture input data for inserts and updates.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class StatusCodeBase(BaseModel):
    code: str = Field(..., max_length=50)
    label: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    color_hex: Optional[str] = Field(None, max_length=7)
    is_active: Optional[bool] = True

    class Config:
        orm_mode = True


class StatusCodeCreate(StatusCodeBase):
    pass


class StatusCodeUpdate(BaseModel):
    label: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    color_hex: Optional[str] = Field(None, max_length=7)
    is_active: Optional[bool] = None


class StatusCodeOut(StatusCodeBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None