import os
from pathlib import Path
from typing import Optional
from app.core.config import settings

# Ensure local fallback directory exists
settings.LOCAL_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


class StorageService:
    def __init__(self):
        self.is_s3_enabled = bool(
            settings.AWS_ACCESS_KEY_ID
            and settings.AWS_SECRET_ACCESS_KEY
            and settings.AWS_S3_BUCKET_NAME
        )
        self.s3_client = None

        if self.is_s3_enabled:
            try:
                import boto3
                self.s3_client = boto3.client(
                    "s3",
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_REGION,
                )
            except Exception as e:
                print(f"[Storage Warning] Failed to initialize Boto3 S3 client: {e}. Falling back to local storage.")
                self.is_s3_enabled = False

    def upload_file(self, file_bytes: bytes, s3_key: str, content_type: str) -> str:
        """Uploads file to AWS S3 or saves locally as fallback."""
        if self.is_s3_enabled and self.s3_client:
            self.s3_client.put_object(
                Bucket=settings.AWS_S3_BUCKET_NAME,
                Key=s3_key,
                Body=file_bytes,
                ContentType=content_type,
            )
            return s3_key
        else:
            # Local disk fallback
            local_path = settings.LOCAL_UPLOADS_DIR / s3_key.replace("/", "_")
            with open(local_path, "wb") as f:
                f.write(file_bytes)
            return str(local_path.name)

    def generate_download_url(self, s3_key: str, expires_in: int = 3600) -> str:
        """Returns a presigned S3 URL or a local download URL."""
        if self.is_s3_enabled and self.s3_client:
            return self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.AWS_S3_BUCKET_NAME, "Key": s3_key},
                ExpiresIn=expires_in,
            )
        else:
            # Fallback download endpoint
            file_name = s3_key.replace("/", "_")
            return f"/api/v1/tickets/attachments/download/{file_name}"


storage = StorageService()
