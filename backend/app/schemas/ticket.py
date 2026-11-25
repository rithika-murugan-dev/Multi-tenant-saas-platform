import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.ticket import (
    MessageType,
    TicketChannel,
    TicketPriority,
    TicketStatus,
)
from app.models.user import UserRole


class UserSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    role: UserRole

    model_config = ConfigDict(from_attributes=True)


class TicketMessageCreate(BaseModel):
    content: str = Field(..., min_length=1)
    message_type: MessageType = MessageType.PUBLIC_REPLY


class TicketMessageOut(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    author: UserSummary
    content: str
    message_type: MessageType
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TicketAttachmentOut(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    uploader: UserSummary
    filename: str
    file_size: int
    content_type: str
    download_url: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TicketCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=5)
    priority: TicketPriority = TicketPriority.MEDIUM
    channel: TicketChannel = TicketChannel.WEB
    customer_id: Optional[uuid.UUID] = Field(None, description="Optional: Staff can specify customer ID on phone/email tickets")
    assigned_agent_id: Optional[uuid.UUID] = Field(None, description="Optional: Assign to a specific agent")
    due_at: Optional[datetime] = Field(None, description="Optional: Staff can override SLA deadline")


class TicketUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=5)
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assigned_agent_id: Optional[uuid.UUID] = None
    due_at: Optional[datetime] = None


class TicketOut(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    title: str
    description: str
    status: TicketStatus
    priority: TicketPriority
    channel: TicketChannel
    customer: UserSummary
    assigned_agent: Optional[UserSummary] = None
    due_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TicketDetailOut(TicketOut):
    messages: List[TicketMessageOut] = []
    attachments: List[TicketAttachmentOut] = []
