import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.users.models import User
from app.users.schemas import UserCreateOAuth

class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> Optional[User]:
        stmt = select(User).where(User.username == username)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
        
    async def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        stmt = select(User).where(User.id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_provider_id(self, provider: str, provider_id: str) -> Optional[User]:
        stmt = select(User).where(User.provider == provider, User.provider_id == provider_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_oauth(self, user_in: UserCreateOAuth) -> User:
        db_user = User(
            email=user_in.email,
            username=user_in.username,
            provider=user_in.provider,
            provider_id=user_in.provider_id,
            avatar_url=user_in.avatar_url
        )
        self.session.add(db_user)
        await self.session.flush()
        await self.session.refresh(db_user)
        return db_user
