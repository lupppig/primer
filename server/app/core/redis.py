import redis.asyncio as aioredis
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class RedisClient:
    def __init__(self):
        self.redis: aioredis.Redis | None = None

    async def connect(self):
        """Initializes the async redis connection pool."""
        try:
            self.redis = aioredis.from_url(
                settings.REDIS_URL, 
                encoding="utf-8", 
                decode_responses=True,
                max_connections=100
            )
            # Ping immediately to verify connection success
            await self.redis.ping()
            logger.info("Successfully connected to Redis.")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise

    async def disconnect(self):
        """Closes the async redis connection pool."""
        if self.redis:
            await self.redis.close()
            self.redis = None

redis_client = RedisClient()

async def get_redis() -> aioredis.Redis:
    """Dependency injected redis client instance."""
    if not redis_client.redis:
        await redis_client.connect()
    return redis_client.redis
