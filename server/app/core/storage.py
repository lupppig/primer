import aioboto3
from contextlib import asynccontextmanager
from nats.js.errors import NotFoundError
from botocore.client import Config
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        self.session = aioboto3.Session()
        self.endpoint_url = f"{'https' if settings.MINIO_SECURE else 'http'}://{settings.MINIO_ENDPOINT}"

    def get_config(self):
        return Config(
            signature_version='s3v4',
            retries={'max_attempts': 3, 'mode': 'standard'}
        )

    @asynccontextmanager
    async def get_client(self):
        """Returns an aioboto3 S3 client context manager."""
        async with self.session.client(
            's3',
            endpoint_url=self.endpoint_url,
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            verify=settings.MINIO_SECURE,
            region_name="us-east-1", # MinIO default region
            config=self.get_config()
        ) as client:
            yield client

    async def ensure_bucket_exists(self):
        async with self.get_client() as client:
            try:
                await client.head_bucket(Bucket=settings.MINIO_BUCKET_NAME)
            except Exception:
                logger.info(f"Creating bucket {settings.MINIO_BUCKET_NAME}")
                await client.create_bucket(Bucket=settings.MINIO_BUCKET_NAME)

    async def upload_file(self, content: bytes, object_name: str, content_type: str):
        async with self.get_client() as client:
            await client.put_object(
                Bucket=settings.MINIO_BUCKET_NAME,
                Key=object_name,
                Body=content,
                ContentType=content_type
            )
            return object_name

    async def get_presigned_url(self, object_name: str, expires_in: int = 3600):
        async with self.get_client() as client:
            url = await client.generate_presigned_url(
                'get_object',
                Params={'Bucket': settings.MINIO_BUCKET_NAME, 'Key': object_name},
                ExpiresIn=expires_in
            )
            return url

    async def get_object(self, object_name: str):
        """Returns the object content and its metadata."""
        async with self.get_client() as client:
            response = await client.get_object(Bucket=settings.MINIO_BUCKET_NAME, Key=object_name)
            # We read the body immediately because the client context manager will close otherwise
            content = await response['Body'].read()
            return {
                "body": content,
                "content_type": response.get('ContentType', 'application/octet-stream')
            }

storage_service = StorageService()
