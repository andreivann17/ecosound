"""
Pydantic schemas package.

Schemas define the shape of request and response bodies exposed via the API.
They are separate from ORM models to decouple external representation from
internal database structures and to apply validation rules.
"""

from .token import Token, TokenData  # noqa: F401
from .user import (
    UserBase,
    UserCreate,
    UserUpdate,
    UserOut,
)  # noqa: F401
from .status_code import (
    StatusCodeBase,
    StatusCodeCreate,
    StatusCodeUpdate,
    StatusCodeOut,
)  # noqa: F401
from .notification import NotificationOut, NotificationCreate, NotificationUpdate  # noqa: F401
from .setting import SettingOut, SettingCreate, SettingUpdate  # noqa: F401