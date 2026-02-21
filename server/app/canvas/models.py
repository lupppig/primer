import uuid
from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.security import generate_uuid

class Design(Base):
    __tablename__ = "designs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    
    # Stores the raw React Flow and parsed graph data securely
    nodes = Column(JSONB, nullable=False, default=list)
    edges = Column(JSONB, nullable=False, default=list)
    settings = Column(JSONB, nullable=False, default=dict)
    
    # Optimistic Concurrency Control
    version = Column(Integer, nullable=False, default=1)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    owner = relationship("User")
