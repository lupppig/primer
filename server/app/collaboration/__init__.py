import uuid
from typing import List
from pydantic import BaseModel, EmailStr
from datetime import datetime

# ---- Collaboration Schemas ----

class InviteRequest(BaseModel):
    email: EmailStr

class CollaboratorResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    username: str
    email: str
    avatar_url: str | None = None
    permission: str
    created_at: datetime

    class Config:
        from_attributes = True

class VisibilityRequest(BaseModel):
    is_public: bool

# ---- Notification Schemas ----

class NotificationResponse(BaseModel):
    id: uuid.UUID
    sender_username: str
    sender_avatar_url: str | None = None
    design_id: uuid.UUID
    design_name: str
    status: str
    message: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True
