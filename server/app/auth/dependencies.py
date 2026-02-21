from fastapi import Request
from jose import jwt, JWTError
from app.core.config import settings
from app.core.exceptions import UnauthorizedException
import uuid

def get_current_user_id(request: Request) -> uuid.UUID:
    """
    Dependency to extract user_id from the HTTP-Only JWT Cookie.
    """
    token = request.cookies.get("access_token")
    if not token:
        raise UnauthorizedException("Not authenticated")
        
    try:
        # Expecting "Bearer <token>"
        scheme, _, token = token.partition(" ")
        if not token:
            token = scheme  # Fallback if just token is sent
            
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise UnauthorizedException("Could not validate credentials")
            
        return uuid.UUID(user_id_str)
    except JWTError:
        raise UnauthorizedException("Could not validate credentials")
