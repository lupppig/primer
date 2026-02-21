import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.canvas.models import Design
from app.canvas.schemas import DesignCreate, DesignUpdate
from app.core.exceptions import ForbiddenException, NotFoundException

class DesignRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, design_id: uuid.UUID) -> Optional[Design]:
        stmt = select(Design).where(Design.id == design_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_designs(self, user_id: uuid.UUID) -> List[Design]:
        stmt = select(Design).where(Design.user_id == user_id).order_by(Design.updated_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, user_id: uuid.UUID, design_in: DesignCreate) -> Design:
        db_design = Design(
            user_id=user_id,
            name=design_in.name,
            description=design_in.description,
            nodes=[node.model_dump() for node in design_in.nodes],
            edges=[edge.model_dump() for edge in design_in.edges],
            settings=design_in.settings,
            version=1
        )
        self.session.add(db_design)
        await self.session.flush()
        await self.session.refresh(db_design)
        return db_design

    async def update(self, user_id: uuid.UUID, design_id: uuid.UUID, design_in: DesignUpdate) -> Design:
        db_design = await self.get_by_id(design_id)
        
        if not db_design:
            raise NotFoundException("Design not found")
        if db_design.user_id != user_id:
            raise ForbiddenException("You do not have permission to modify this design")
            
        # Optimistic Locking check
        if db_design.version != design_in.version:
            raise ConflictException("Design has been modified by another session. Please reload.")
            
        db_design.name = design_in.name
        db_design.description = design_in.description
        db_design.nodes = [node.model_dump() for node in design_in.nodes]
        db_design.edges = [edge.model_dump() for edge in design_in.edges]
        db_design.settings = design_in.settings
        db_design.version += 1
        
        await self.session.flush()
        await self.session.refresh(db_design)
        return db_design

    async def delete(self, user_id: uuid.UUID, design_id: uuid.UUID):
        db_design = await self.get_by_id(design_id)
        if not db_design:
            raise NotFoundException("Design not found")
        if db_design.user_id != user_id:
            raise ForbiddenException("You do not have permission to delete this design")
            
        await self.session.delete(db_design)
        await self.session.flush()

class ConflictException(Exception):
    def __init__(self, message: str = "Resource conflict detected"):
        self.message = message
        self.status_code = 409
        super().__init__(self.message)
