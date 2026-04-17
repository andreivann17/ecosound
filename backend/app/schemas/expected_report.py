"""
ExpectedReport schemas.

Models to create, update and return expected reports definitions.
"""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class ExpectedReportBase(BaseModel):
    client_name: str
    frequency: str  # 'weekly' or 'monthly'
    day_or_cutoff: Optional[int] = None
    active_from: date
    active_to: Optional[date] = None

    class Config:
        orm_mode = True


class ExpectedReportCreate(ExpectedReportBase):
    pass


class ExpectedReportUpdate(BaseModel):
    frequency: Optional[str] = None
    day_or_cutoff: Optional[int] = None
    active_from: Optional[date] = None
    active_to: Optional[date] = None


class ExpectedReportOut(ExpectedReportBase):
    id: int
    created_at: datetime