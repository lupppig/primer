import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import get_current_user_id
from app.canvas.schemas import DesignResponse, DesignCreate, DesignUpdate
from app.canvas.repository import DesignRepository

router = APIRouter(prefix="/canvas", tags=["canvas"])

@router.post("/design", response_model=DesignResponse, status_code=status.HTTP_201_CREATED)
async def create_design(
    design_in: DesignCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    repo = DesignRepository(db)
    return await repo.create(user_id, design_in)

@router.get("/design/{design_id}", response_model=DesignResponse)
async def get_design(
    design_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    repo = DesignRepository(db)
    design = await repo.get_by_id(design_id)
    if not design or design.user_id != user_id:
        # Prevent existence leakage by returning 404 for unauthorized access
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Design not found")
    return design

@router.put("/design/{design_id}", response_model=DesignResponse)
async def update_design(
    design_id: uuid.UUID,
    design_in: DesignUpdate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    repo = DesignRepository(db)
    return await repo.update(user_id, design_id, design_in)

@router.delete("/design/{design_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_design(
    design_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    repo = DesignRepository(db)
    await repo.delete(user_id, design_id)

@router.get("/my-designs", response_model=List[DesignResponse])
async def list_user_designs(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    repo = DesignRepository(db)
    return await repo.get_user_designs(user_id)
