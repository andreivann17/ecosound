"""
Case schemas.

These models describe the payloads for working with legal cases and
their historical records.  ``CaseOut`` may include the most recent
snapshot (``CaseLatestOut``) if requested via the API.
"""

from datetime import date, datetime
from typing import Optional, List

from pydantic import BaseModel, Field


class CaseBase(BaseModel):
    expediente: str = Field(..., max_length=64)
    client_name: Optional[str] = Field(None, max_length=255)
    lawyer_name: Optional[str] = Field(None, max_length=255)
    city_name: Optional[str] = Field(None, max_length=128)
    opened_year: Optional[int] = None
    is_active: Optional[bool] = True

    class Config:
        orm_mode = True


class CaseCreate(CaseBase):
    pass


class CaseUpdate(BaseModel):
    client_name: Optional[str] = Field(None, max_length=255)
    lawyer_name: Optional[str] = Field(None, max_length=255)
    city_name: Optional[str] = Field(None, max_length=128)
    opened_year: Optional[int] = None
    is_active: Optional[bool] = None


class CaseLatestOut(BaseModel):
    case_id: int
    last_report_date: date
    last_status_code_id: Optional[int] = None
    last_status_text: Optional[str] = None
    last_status_detail: Optional[str] = None
    updated_at: datetime

    class Config:
        orm_mode = True


class CaseOut(CaseBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    latest: Optional[CaseLatestOut] = None

    class Config:
        orm_mode = True


class CaseHistoryEntry(BaseModel):
    id: int
    report_date: date
    status_code_id: Optional[int] = None
    status_text: Optional[str] = None
    status_detail: Optional[str] = None
    comments: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True


class CaseWithLatest(CaseOut):
    history: List[CaseHistoryEntry] = []