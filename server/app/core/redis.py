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

    async def is_rate_limited(self, key: str, limit: int, window: int) -> bool:
        """
        Uses a simple fixed-window token bucket.
        Returns True if the request should be blocked.
        """
        if not self.redis:
            return False
            
        current = await self.redis.incr(key)
        if current == 1:
            await self.redis.expire(key, window)
            
        return current > limit
        
    async def block_token(self, jti: str, exp_timestamp: int):
        """Adds a JWT to the blocklist until it expires naturally."""
        if not self.redis:
            return
            
        import time
        ttl = exp_timestamp - int(time.time())
        if ttl > 0:
            await self.redis.setex(f"blocklist:{jti}", ttl, "1")
            
    async def is_token_blocked(self, jti: str) -> bool:
        """Checks if a JWT is in the blocklist."""
        if not self.redis:
            return False
        return await self.redis.exists(f"blocklist:{jti}") > 0

redis_client = RedisClient()

async def get_redis() -> aioredis.Redis:
    """Dependency injected redis client instance."""
    if not redis_client.redis:
        await redis_client.connect()
    return redis_client.redis
