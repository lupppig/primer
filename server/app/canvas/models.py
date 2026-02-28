import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, Integer, DateTime, Boolean, Enum, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.security import generate_uuid

class PermissionLevel(str, enum.Enum):
    viewer = "viewer"
    editor = "editor"

class Design(Base):
    __tablename__ = "designs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    is_public = Column(Boolean, default=False, nullable=False)
    
    nodes = Column(JSONB, nullable=False, default=list)
    edges = Column(JSONB, nullable=False, default=list)
    settings = Column(JSONB, nullable=False, default=dict)
    
    version = Column(Integer, nullable=False, default=1)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    owner = relationship("User")
    collaborators = relationship("DesignCollaborator", back_populates="design", cascade="all, delete-orphan")


class DesignCollaborator(Base):
    __tablename__ = "design_collaborators"
    __table_args__ = (
        UniqueConstraint("design_id", "user_id", name="uq_design_collaborator"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    design_id = Column(UUID(as_uuid=True), ForeignKey("designs.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    permission = Column(Enum(PermissionLevel), nullable=False, default=PermissionLevel.editor)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    design = relationship("Design", back_populates="collaborators")
    user = relationship("User")
