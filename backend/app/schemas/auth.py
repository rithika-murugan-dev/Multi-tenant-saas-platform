import uuid
from pydantic import BaseModel, EmailStr, Field
from app.schemas.tenant import TenantOut
from app.schemas.user import UserOut


class TenantRegistration(BaseModel):
    # Company details
    company_name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(
        ...,
        min_length=2,
        max_length=50,
        pattern=r"^[a-z0-9-]+$",
        description="Subdomain or unique slug (e.g. acme)",
    )
    # Admin User details
    admin_name: str = Field(..., min_length=2, max_length=100)
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=8)


class TenantRegistrationResponse(BaseModel):
    message: str
    tenant: TenantOut
    admin_user: UserOut
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    tenant_slug: str = Field(..., description="The slug of the tenant company logging into")
