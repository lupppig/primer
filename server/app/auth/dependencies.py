from fastapi import Request
from jose import jwt, JWTError
from app.core.config import settings
from app.core.exceptions import UnauthorizedException
from app.core.redis import redis_client
import uuid

async def get_current_user_id(request: Request) -> uuid.UUID:
    """
    Dependency to extract user_id from the HTTP-Only JWT Cookie.
    """
    # Bypassing for internal capture worker if a system token is provided
    system_token = request.headers.get("X-System-Token")
    if system_token and system_token == settings.SECRET_KEY: # Using SECRET_KEY as a simple shared secret for now
        # We need to know which user this is for. 
        # For simplicity, we'll allow a sub header or just use the system context
        user_id_override = request.headers.get("X-User-ID")
        if user_id_override:
            return uuid.UUID(user_id_override)

    token = request.cookies.get("access_token")
    if not token:
        raise UnauthorizedException("Not authenticated")
        
    try:
        # Expecting "Bearer <token>"
        scheme, _, token = token.partition(" ")
        if not token:
            token = scheme  # Fallback if just token is sent
            
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        
        jti = payload.get("jti")
        if jti and await redis_client.is_token_blocked(jti):
            raise UnauthorizedException("Token has been revoked")
            
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise UnauthorizedException("Could not validate credentials")
            
        return uuid.UUID(user_id_str)
    except JWTError:
        raise UnauthorizedException("Could not validate credentials")
