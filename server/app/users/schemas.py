import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)

class UserCreateOAuth(UserBase):
    provider_id: str
    provider: str = "github"
    avatar_url: Optional[str] = None

class UserResponse(UserBase):
    id: uuid.UUID
    provider: Optional[str] = "github"
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
