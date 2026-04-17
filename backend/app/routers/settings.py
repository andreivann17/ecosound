"""
Settings router.

Exposes endpoints for retrieving and updating application settings.
Settings are stored as arbitrary key/value pairs in the ``settings``
table.  Only admins may create, update or delete settings.
"""

from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status,Response
from sqlalchemy.orm import Session

from ..models.setting import Setting
from ..schemas.setting import SettingCreate, SettingUpdate, SettingOut

router = APIRouter(prefix="/settings", tags=["settings"])

