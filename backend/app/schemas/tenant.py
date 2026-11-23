import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class TenantBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Company/Tenant Name")
    slug: str = Field(
        ...,
        min_length=2,
        max_length=50,
        pattern=r"^[a-z0-9-]+$",
        description="Subdomain or unique slug identifier",
    )
    domain: Optional[str] = Field(None, max_length=255)
    plan: Optional[str] = "starter"


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    domain: Optional[str] = None
    plan: Optional[str] = None
    is_active: Optional[bool] = None


class TenantOut(TenantBase):
    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
