import enum
import uuid
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Boolean, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant


class UserRole(str, enum.Enum):
    SUPERADMIN = "superadmin"      # Platform owner
    TENANT_ADMIN = "tenant_admin"  # Company/Org owner
    MANAGER = "manager"            # Team leads / supervisors
    AGENT = "agent"                # Support & operations reps
    CUSTOMER = "customer"          # External clients submitting tickets


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    # tenant_id can be null only for platform superadmins
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False, length=50),
        default=UserRole.AGENT,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationship to Tenant
    tenant: Mapped[Optional["Tenant"]] = relationship("Tenant", back_populates="users")

    __table_args__ = (
        # Ensure email is unique per tenant
        UniqueConstraint("tenant_id", "email", name="uq_tenant_user_email"),
    )

    def __repr__(self) -> str:
        return f"<User email={self.email} role={self.role} tenant_id={self.tenant_id}>"
