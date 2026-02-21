from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import OAuth2PasswordRequestForm

from app.core.database import get_db
from app.core.exceptions import UnauthorizedException, ValidationException
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.core.config import settings
from app.users.schemas import UserCreate, UserResponse, UserLogin
from app.users.repository import UserRepository

router = APIRouter(prefix="/auth", tags=["auth"])

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    """Utility to set HTTP-Only secure cookies for JWTs."""
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=True, # Should be True in production (HTTPS)
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )

@router.post("/register", response_model=UserResponse)
async def register(
    user_in: UserCreate, 
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    repo = UserRepository(db)
    
    if await repo.get_by_email(user_in.email):
        raise ValidationException("Email already registered")
    if await repo.get_by_username(user_in.username):
        raise ValidationException("Username already registered")
        
    user = await repo.create(user_in)
    
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    
    set_auth_cookies(response, access_token, refresh_token)
    return user

@router.post("/login", response_model=UserResponse)
async def login(
    user_in: UserLogin,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    repo = UserRepository(db)
    user = await repo.get_by_email(user_in.email)
    
    if not user or not user.hashed_password:
        raise UnauthorizedException("Incorrect email or password")
        
    if not verify_password(user_in.password, user.hashed_password):
        raise UnauthorizedException("Incorrect email or password")
        
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    
    set_auth_cookies(response, access_token, refresh_token)
    return user

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}

@router.get("/oauth/github")
async def oauth_github_placeholder():
    # Placeholder for OAuth2 Github redirect logic
    return {"message": "Redirect to GitHub OAuth"}

@router.get("/oauth/google")
async def oauth_google_placeholder():
    # Placeholder for OAuth2 Google redirect logic
    return {"message": "Redirect to Google OAuth"}
