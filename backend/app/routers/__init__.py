"""
API routers package.

This package aggregates all router modules so that they can easily be
imported and included in the FastAPI application.  Each router
corresponds to a set of endpoints grouped by resource or feature.
"""

from .auth import router as auth  # noqa: F401
from .users import router as users  # noqa: F401
