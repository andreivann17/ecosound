"""
Schemas for token handling.

Defines the shape of JWT tokens returned by the authentication endpoints
and the data extracted from them.
"""

from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: str | None = None