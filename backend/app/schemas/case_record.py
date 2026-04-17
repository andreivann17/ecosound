"""
CaseRecord schemas.

Defines the shape of requests and responses for case record
operations.  These schemas include IDs and timestamps for responses.
"""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class CaseRecordBase(BaseModel):
    import_batch_id: int
    expediente: str = Field(..., max_length=64)
    year_opened: Optional[int] = None
    actor_name: Optional[str] = Field(None, max_length=255)
    client_name: Optional[str] = Field(None, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    lawyer_name: Optional[str] = Field(None, max_length=255)
    city_name: Optional[str] = Field(None, max_length=128)
    status_text: Optional[str] = Field(None, max_length=255)
    status_detail: Optional[str] = Field(None, max_length=500)
    comments: Optional[str] = Field(None, max_length=500)
    report_date: date
    status_code_id: Optional[int] = None

    class Config:
        orm_mode = True


class CaseRecordCreate(CaseRecordBase):
    pass


class CaseRecordUpdate(BaseModel):
    actor_name: Optional[str] = Field(None, max_length=255)
    client_name: Optional[str] = Field(None, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    lawyer_name: Optional[str] = Field(None, max_length=255)
    city_name: Optional[str] = Field(None, max_length=128)
    status_text: Optional[str] = Field(None, max_length=255)
    status_detail: Optional[str] = Field(None, max_length=500)
    comments: Optional[str] = Field(None, max_length=500)
    status_code_id: Optional[int] = None


class CaseRecordOut(CaseRecordBase):
    id: int
    case_id: Optional[int] = None
    row_sha256: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True