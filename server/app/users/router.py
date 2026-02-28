import uuid
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.storage import storage_service
from app.core.exceptions import ValidationException, UnauthorizedException
from app.auth.dependencies import get_current_user_id
from app.users.repository import UserRepository
from app.users.schemas import UserResponse

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Upload a custom profile picture and save it to MinIO."""
    
    # Basic validation
    if not file.content_type.startswith("image/"):
        raise ValidationException("File must be an image type (PNG, JPEG, etc).")
        
    # Read file size securely
    content = await file.read()
    if len(content) > 5 * 1024 * 1024: # 5MB limit
        raise ValidationException("Avatar file size must be under 5MB.")
        
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise UnauthorizedException("User not found.")
        
    # Upload to MinIO
    extension = file.filename.split('.')[-1] if '.' in file.filename else 'png'
    object_name = f"avatars/{user_id}.{extension}"
    
    await storage_service.upload_file(content, object_name, file.content_type)
    
    # Store the presigned URL permanently (or dynamically construct it later)
    # Since we need this avatar constantly, we can just save the presigned URL or public URL
    # For a private bucket without a CDN, we'll ask MinIO for a long-lived presigned URL 
    # (7 days max for S3v4, but we can generate them dynamically. 
    # For a simple avatar feature, we can just save the raw key and resolve it on the client, 
    # or expose a specific download endpoint.
    
    # Let's write the object key to `avatar_url` but prefix it with our API download route 
    # so the frontend can just stick it in an <img src="..." />
    download_url = f"/api/v1/users/avatar/{object_name}"
    
    user.avatar_url = download_url
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user

@router.get("/avatar/avatars/{filename}")
async def get_avatar(filename: str):
    """Proxy route to download the avatar from the private MinIO bucket."""
    from fastapi.responses import Response
    object_name = f"avatars/{filename}"
    try:
        data = await storage_service.get_object(object_name)
        return Response(content=data["body"], media_type=data["content_type"])
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Avatar not found")
