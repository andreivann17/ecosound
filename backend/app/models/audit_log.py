"""
AuditLog model.

Stores audit events for the system.  Each entry captures the type and
identifier of the affected entity, the action performed, and JSON
representations of the entity before and after the change.  It also
records who performed the action and when.
"""

from sqlalchemy import (
    Column,
    BigInteger,
    String,
    ForeignKey,
    DateTime,
    LargeBinary,
    JSON,
    func,
)
from sqlalchemy.orm import relationship

from ..database.database import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    entity_type = Column(String(64), nullable=False)
    entity_id = Column(BigInteger, nullable=False)
    action = Column(String(32), nullable=False)

    ip = Column(LargeBinary(16), nullable=True)
    before_json = Column(JSON, nullable=True)
    after_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User")

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} entity={self.entity_type}:{self.entity_id} action={self.action}>"