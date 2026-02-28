import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import logging

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.exceptions import setup_exception_handlers
from app.core.middleware import SecurityHeadersMiddleware, CSRFMiddleware, RateLimitMiddleware
from app.core.redis import redis_client
from app.core.nats import nats_client
from app.auth.router import router as auth_router
from app.users.router import router as users_router
from app.canvas.router import router as canvas_router
from app.simulation.router import router as simulation_router
from app.collaboration.router import router as collaboration_router
from app.simulation.worker import start_simulation_worker
from app.simulation.export_worker import start_export_worker
from app.simulation.cleanup_job import start_cleanup_job

# Setup centralized logging config
setup_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Events
    logger.info("Initializing Primer Backend Services...")
    await redis_client.connect()
    await nats_client.connect()
    
    # Start background workers
    app.state.simulation_worker_task = asyncio.create_task(start_simulation_worker())
    app.state.export_worker_task = asyncio.create_task(start_export_worker())
    app.state.cleanup_job_task = asyncio.create_task(start_cleanup_job())
    
    yield
    
    # Shutdown Events
    logger.info("Shutting down Primer Backend Services...")
    if hasattr(app.state, "simulation_worker_task"):
        app.state.simulation_worker_task.cancel()
    if hasattr(app.state, "export_worker_task"):
        app.state.export_worker_task.cancel()
    if hasattr(app.state, "cleanup_job_task"):
        app.state.cleanup_job_task.cancel()
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
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(canvas_router, prefix=settings.API_V1_STR)
app.include_router(simulation_router, prefix=settings.API_V1_STR)
app.include_router(collaboration_router, prefix=settings.API_V1_STR)

# Middlewares (Order matters)
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS, # Centralized CORS
    allow_credentials=True, # Required for our HTTP-Only JWT cookies
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(CSRFMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}
