from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.email import send_real_email
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, TenantRegistration, TenantRegistrationResponse
from app.schemas.token import Token
from app.schemas.user import UserOut

router = APIRouter()


class TestEmailRequest(BaseModel):
    recipient_email: EmailStr


@router.post(
    "/register",
    response_model=TenantRegistrationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new Tenant Company & Admin User",
)
async def register_tenant(
    payload: TenantRegistration,
    db: AsyncSession = Depends(get_db),
):
    existing_tenant = await db.execute(
        select(Tenant).where(Tenant.slug == payload.slug.lower())
    )
    if existing_tenant.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Company identifier '{payload.slug}' is already registered.",
        )

    new_tenant = Tenant(
        name=payload.company_name,
        slug=payload.slug.lower(),
        plan="starter",
    )
    db.add(new_tenant)
    await db.flush()

    admin_user = User(
        tenant_id=new_tenant.id,
        email=payload.admin_email.lower(),
        full_name=payload.admin_name,
        hashed_password=get_password_hash(payload.admin_password),
        role=UserRole.TENANT_ADMIN,
        is_active=True,
    )
    db.add(admin_user)
    await db.flush()

    access_token = create_access_token(
        subject=str(admin_user.id),
        tenant_id=str(new_tenant.id),
        role=admin_user.role.value,
    )

    return TenantRegistrationResponse(
        message="Organization and administrator account created successfully.",
        tenant=new_tenant,
        admin_user=admin_user,
        access_token=access_token,
        token_type="bearer",
    )


@router.post("/login", response_model=Token, summary="Login with Email and Tenant Slug")
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    tenant_res = await db.execute(
        select(Tenant).where(Tenant.slug == payload.tenant_slug.lower())
    )
    tenant = tenant_res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found.",
        )
    if not tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This company account is currently deactivated.",
        )

    user_res = await db.execute(
        select(User).where(
            User.tenant_id == tenant.id,
            User.email == payload.email.lower(),
        )
    )
    user = user_res.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated. Contact your company administrator.",
        )

    token = create_access_token(
        subject=str(user.id),
        tenant_id=str(tenant.id),
        role=user.role.value,
    )

    return Token(access_token=token, token_type="bearer")


@router.get("/me", response_model=UserOut, summary="Get Current Authenticated User")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/test-email", summary="Send a test email to your real inbox")
async def test_email(payload: TestEmailRequest):
    """
    Test endpoint to verify real email delivery via SMTP.
    """
    subject = "🎉 WorkFlow Pro: Real Email Delivery Test"
    body = (
        f"Hello!\n\n"
        f"This is a real test email from your Multi-Tenant SaaS Helpdesk platform.\n\n"
        f"If you are reading this in your inbox, your SMTP email integration is fully working!"
    )
    delivered = send_real_email(recipient=payload.recipient_email, subject=subject, body_text=body)
    return {
        "status": "delivered" if delivered else "simulated",
        "recipient": payload.recipient_email,
        "smtp_configured": bool(settings.SMTP_USER and settings.SMTP_PASSWORD),
        "message": (
            "Email delivered to your inbox!"
            if delivered
            else "SMTP credentials not provided in .env yet — check console log or add SMTP_USER & SMTP_PASSWORD to send to your real inbox."
        ),
    }
