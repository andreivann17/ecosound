# app/schemas/user.py
import datetime as dt
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class UserBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str = Field(..., max_length=255)
    email: EmailStr
    active: bool | None = True
    token: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    id_user_creation: Optional[int] = None
    date: dt.date | None = None
    time: dt.time | None = None

class UserUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6)
    active: Optional[bool] = None
    token: Optional[str] = None

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id_user: int
    name: str
    email: str
    active: bool | None = None
    date: dt.date | None = None
    time: dt.time | None = None
    id_user_creation: int | None = None
    date_creation: dt.date | None = None
    time_creation: dt.time | None = None
    token: str | None = None
