import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_tenant, get_current_user, get_db, require_roles
from app.core.security import get_password_hash
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserOut, UserUpdate

router = APIRouter()


@router.get(
    "/",
    response_model=List[UserOut],
    summary="List all users in the current organization",
)
async def list_users(
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_roles(UserRole.TENANT_ADMIN, UserRole.MANAGER)),
    db: AsyncSession = Depends(get_db),
):
    """List all employees/agents/customers belonging to the tenant."""
    query = select(User).where(User.tenant_id == tenant.id).order_by(User.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post(
    "/",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create/Invite a new user to the organization",
)
async def create_user(
    payload: UserCreate,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_roles(UserRole.TENANT_ADMIN, UserRole.MANAGER)),
    db: AsyncSession = Depends(get_db),
):
    """
    Tenant Admins or Managers can add new Agents, Managers, or Customers
    strictly within their own tenant boundary.
    """
    # Prevent managers from creating Tenant Admins
    if payload.role == UserRole.TENANT_ADMIN and current_user.role != UserRole.TENANT_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Tenant Admins can create other Admin accounts.",
        )

    # Check if user already exists within this tenant
    existing = await db.execute(
        select(User).where(
            User.tenant_id == tenant.id,
            User.email == payload.email.lower(),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with email '{payload.email}' already exists in this organization.",
        )

    new_user = User(
        tenant_id=tenant.id,
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=payload.role or UserRole.AGENT,
        is_active=True,
    )
    db.add(new_user)
    await db.flush()
    return new_user


@router.get(
    "/{user_id}",
    response_model=UserOut,
    summary="Get user details by ID within organization",
)
async def get_user(
    user_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant.id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in this organization.",
        )
    return user
