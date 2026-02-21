from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.core.config import settings

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        """
        Injects strict security headers into every HTTP response.
        - Prevents clickjacking, MIME sniffing, and controls referrer info.
        - Sets up baseline Content Security Policy (API only, so resticting).
        """
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        return response

class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        """
        Validates the origin of the request to prevent Cross-Site Request Forgery.
        Only allows requests from the defined FRONTEND_URL.
        """
        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            origin = request.headers.get("origin")
            referer = request.headers.get("referer")
            
            allowed_origin = settings.FRONTEND_URL
            
            # 1. Check Origin header (modern browsers)
            if origin and origin != allowed_origin:
                from starlette.responses import JSONResponse
                return JSONResponse(
                    status_code=403,
                    content={"detail": "CSRF verification failed: Origin mismatch."}
                )
            
            # 2. Check Referer header (fallback)
            if not origin and referer and not referer.startswith(allowed_origin):
                from starlette.responses import JSONResponse
                return JSONResponse(
                    status_code=403,
                    content={"detail": "CSRF verification failed: Invalid referer."}
                )
                
            # 3. If neither origin nor referer is present on a mutating request, block it
            if not origin and not referer:
                from starlette.responses import JSONResponse
                return JSONResponse(
                    status_code=403,
                    content={"detail": "CSRF verification failed: Missing origin/referer headers."}
                )
            
        return await call_next(request)
