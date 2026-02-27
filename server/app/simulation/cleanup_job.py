import asyncio
import logging
from datetime import datetime
from sqlalchemy import select, delete

from app.core.database import AsyncSessionLocal
from app.simulation.persistence import SimulationExport
from app.core.storage import storage_service
from app.core.config import settings

logger = logging.getLogger(__name__)

async def start_cleanup_job():
    """
    Background job that runs every hour to delete expired export files
    from MinIO and their records from the database.
    """
    logger.info("Cleanup Job started. Running every 1 hour...")
    
    while True:
        try:
            await run_cleanup()
        except Exception as e:
            logger.exception(f"Error in cleanup job: {e}")
            
        # Run every hour
        await asyncio.sleep(3600)

async def run_cleanup():
    """
    Finds expired exports and deletes them.
    """
    now = datetime.utcnow()
    
    async with AsyncSessionLocal() as db:
        # Find expired exports with files
        result = await db.execute(
            select(SimulationExport).where(
                SimulationExport.expires_at < now
            )
        )
        expired_exports = result.scalars().all()
        
        if not expired_exports:
            return

        async with storage_service.get_client() as client:
            for export in expired_exports:
                if export.file_url:
                    try:
                        logger.info(f"Deleting expired file {export.file_url} from MinIO")
                        await client.delete_object(
                            Bucket=settings.MINIO_BUCKET_NAME,
                            Key=export.file_url
                        )
                    except Exception as e:
                        logger.error(f"Failed to delete {export.file_url} from MinIO: {e}")
        
        # Delete from DB
        export_ids = [e.id for e in expired_exports]
        await db.execute(
            delete(SimulationExport).where(
                SimulationExport.id.in_(export_ids)
            )
        )
        await db.commit()
        logger.info(f"Cleaned up {len(expired_exports)} expired export records")
