from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.exceptions import setup_exception_handlers
from app.core.middleware import SecurityHeadersMiddleware, CSRFMiddleware
from app.core.redis import redis_client
from app.core.nats import nats_client
from app.auth.router import router as auth_router
from app.canvas.router import router as canvas_router
from app.simulation.router import router as simulation_router

# Setup centralized logging config
setup_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Events
    logger.info("Initializing Primer Backend Services...")
    await redis_client.connect()
    await nats_client.connect()
    
    yield
    
    # Shutdown Events
    logger.info("Shutting down Primer Backend Services...")
    await redis_client.disconnect()
    await nats_client.disconnect()

# Initialize FastAPI App
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Exception Handlers
setup_exception_handlers(app)

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(canvas_router, prefix=settings.API_V1_STR)
app.include_router(simulation_router, prefix=settings.API_V1_STR)

# Middlewares (Order matters)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS, # Centralized CORS
    allow_credentials=True, # Required for our HTTP-Only JWT cookies
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(CSRFMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}
