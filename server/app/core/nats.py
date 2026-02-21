import logging
import nats
from nats.js import JetStreamContext
from app.core.config import settings

logger = logging.getLogger(__name__)

class NATSClient:
    def __init__(self):
        self.nc: nats.NATS | None = None
        self.js: JetStreamContext | None = None

    async def connect(self):
        """Initializes connection to the NATS cluster and activates JetStream."""
        try:
            self.nc = await nats.connect(servers=[settings.NATS_URL])
            self.js = self.nc.jetstream()
            logger.info("Successfully connected to NATS JetStream.")
            
            # Optionally setup streams immediately for specific topics if they don't exist
            # await self.js.add_stream(name="SIMULATION", subjects=["simulations.*"])
            
        except Exception as e:
            logger.error(f"Failed to connect to NATS JetStream: {e}")
            raise

    async def disconnect(self):
        """Closes the connection gracefully."""
        if self.nc and not self.nc.is_closed:
            await self.nc.drain()
            logger.info("Drained and disconnected from NATS.")

nats_client = NATSClient()

async def get_nats_js() -> JetStreamContext:
    """Dependency injected NATS JetStream context."""
    if not nats_client.js:
        await nats_client.connect()
    return nats_client.js
