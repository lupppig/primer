from fastapi import APIRouter, Depends, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from starlette.responses import RedirectResponse
import random
import string

from app.core.database import get_db
from app.core.exceptions import UnauthorizedException
from app.core.security import create_access_token, create_refresh_token
from app.core.config import settings
from app.core.redis import redis_client
from app.auth.dependencies import get_current_user_id
from app.users.schemas import UserResponse, UserCreateOAuth
from app.users.repository import UserRepository
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])

# Configure Authlib OAuth
oauth_config = Config(environ={
    "GITHUB_CLIENT_ID": settings.GITHUB_CLIENT_ID,
    "GITHUB_CLIENT_SECRET": settings.GITHUB_CLIENT_SECRET
})
oauth = OAuth(oauth_config)
oauth.register(
    name='github',
    api_base_url='https://api.github.com/',
    access_token_url='https://github.com/login/oauth/access_token',
    authorize_url='https://github.com/login/oauth/authorize',
    client_kwargs={'scope': 'user:email'},
)

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    """Utility to set HTTP-Only secure cookies for JWTs."""
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=False, # Set to True only in production with HTTPS
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )

@router.get("/oauth/github")
async def oauth_github(request: Request):
    """Redirects the user to the GitHub OAuth consent screen."""
    redirect_uri = f"{settings.API_V1_STR}/auth/oauth/github/callback"
    absolute_redirect_uri = request.url_for("oauth_github_callback")._url
    # Ensure protocol matches if running behind proxy
    if absolute_redirect_uri.startswith("http://") and settings.FRONTEND_URL.startswith("https://"):
        absolute_redirect_uri = absolute_redirect_uri.replace("http://", "https://")
    return await oauth.github.authorize_redirect(request, absolute_redirect_uri)

@router.get("/oauth/github/callback", name="oauth_github_callback")
async def oauth_github_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handles the OAuth callback from GitHub, creates/fetches user, sets cookies."""
    try:
        token = await oauth.github.authorize_access_token(request)
    except Exception as e:
        import traceback
        logger.error(f"OAuth Error: {str(e)}\n{traceback.format_exc()}")
        raise UnauthorizedException(f"Failed to authenticate with GitHub: {str(e)}")
        
    resp = await oauth.github.get('user', token=token)
    profile = resp.json()
    
    # Needs a separate request for emails because of the `user:email` scope handling
    email = profile.get("email")
    if not email:
        emails_resp = await oauth.github.get('user/emails', token=token)
        emails = emails_resp.json()
        primary_email = next((e for e in emails if e.get("primary")), None)
        if primary_email:
            email = primary_email.get("email")
            
    if not email:
        raise UnauthorizedException("Could not retrieve email from GitHub")

    provider_id = str(profile.get("id"))
    username = profile.get("login")
    avatar_url = profile.get("avatar_url")
    
    repo = UserRepository(db)
    
    # 1. Check if user exists by Github ID
    user = await repo.get_by_provider_id("github", provider_id)
    
    if not user:
        # 2. Check if user exists by Email (linking old accounts)
        user = await repo.get_by_email(email)
        if user:
            # Link existing account to GitHub
            user.provider = "github"
            user.provider_id = provider_id
            user.avatar_url = avatar_url
            db.add(user)
            await db.flush()
        else:
            # Handle username collisions
            base_username = username
            suffix = ""
            while await repo.get_by_username(f"{base_username}{suffix}"):
                suffix = f"_{''.join(random.choices(string.ascii_lowercase + string.digits, k=4))}"
            
            user_in = UserCreateOAuth(
                email=email,
                username=f"{base_username}{suffix}",
                provider="github",
                provider_id=provider_id,
                avatar_url=avatar_url
            )
            user = await repo.create_oauth(user_in)

    # Issue our own JWTs
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    
    response = RedirectResponse(url=settings.FRONTEND_URL)
    set_auth_cookies(response, access_token, refresh_token)
    return response

@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("access_token")
    if token:
        try:
            scheme, _, token_val = token.partition(" ")
            if not token_val:
                token_val = scheme
                
            payload = jwt.decode(token_val, settings.SECRET_KEY, algorithms=["HS256"])
            jti = payload.get("jti")
            exp = payload.get("exp")
            
            if jti and exp:
                await redis_client.block_token(jti, exp)
        except JWTError:
            pass
            
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
async def get_me(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise UnauthorizedException("User not found")
    return user
