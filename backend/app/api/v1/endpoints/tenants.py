from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_tenant, get_current_user, get_db, require_roles
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.schemas.tenant import TenantOut, TenantUpdate

router = APIRouter()


@router.get("/current", response_model=TenantOut, summary="Get Current Tenant Details")
async def get_current_tenant_info(
    tenant: Tenant = Depends(get_current_tenant),
):
    """Retrieve details for the tenant company the logged-in user belongs to."""
    return tenant


@router.patch(
    "/current",
    response_model=TenantOut,
    summary="Update Current Tenant Details (Admin only)",
)
async def update_current_tenant_info(
    payload: TenantUpdate,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_roles(UserRole.TENANT_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Allows a Tenant Admin to update their company details."""
    if payload.name is not None:
        tenant.name = payload.name
    if payload.domain is not None:
        tenant.domain = payload.domain

    db.add(tenant)
    return tenant
