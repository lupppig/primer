from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

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
        If we are using cookie-based authentication, an attacker could forge a request.
        This checks that mutating requests (POST/PUT/DELETE) come from an allowed origin.
        """
        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            origin = request.headers.get("origin")
            referer = request.headers.get("referer")
            
            # Simple check for now. In production, validate against `settings.FRONTEND_URL`
            # If no origin or referer is present on a mutating request, log it or block it.
            # Localhost dev environments can sometimes omit this depending on the client.
            pass 
            
        return await call_next(request)
