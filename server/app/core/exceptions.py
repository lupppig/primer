from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

class PrimerException(Exception):
    """Base exception for Primer Custom Exceptions."""
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code

class NotFoundException(PrimerException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)

class UnauthorizedException(PrimerException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status_code=401)

class ForbiddenException(PrimerException):
    def __init__(self, message: str = "Forbidden access"):
        super().__init__(message, status_code=403)

class ValidationException(PrimerException):
    def __init__(self, message: str = "Validation failed"):
        super().__init__(message, status_code=422)

async def primer_exception_handler(request: Request, exc: PrimerException):
    """Handles specifically mapped Primer errors predictably."""
    logger.warning(f"Handled Exception: {exc.message} - Path: {request.url.path}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message}
    )

async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all for internal server errors.
    Prevents stack trace leakage to clients.
    """
    logger.error(f"Unhandled Server Error at {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."}
    )

def setup_exception_handlers(app: FastAPI):
    app.add_exception_handler(PrimerException, primer_exception_handler)
    app.add_exception_handler(Exception, global_exception_handler)
