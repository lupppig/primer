from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.core.security import generate_uuid

def get_utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True) # Nullable for OAuth-only accounts
    
    # OAuth Provider Identification
    provider = Column(String(50), nullable=True, default="local")
    provider_id = Column(String(255), nullable=True, unique=True)
    
    is_active = Column(Boolean(), default=True)
    is_superuser = Column(Boolean(), default=False)
    
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)
