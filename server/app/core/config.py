from typing import Any, Dict, Optional
from pydantic import PostgresDsn, RedisDsn, AnyHttpUrl, validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Base Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Primer Backend"
    
    # Security Configuration
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # Database URIs
    DATABASE_URL: str
    REDIS_URL: str
    NATS_URL: str = "nats://localhost:4222"
    
    # OAuth2 (Leave empty for purely local unauthenticated use-cases)
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
