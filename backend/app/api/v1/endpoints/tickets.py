import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.api.deps import get_current_tenant, get_current_user, get_db
from app.core.config import settings
from app.core.s3 import storage
from app.core.websockets import ws_manager
from app.models.attachment import TicketAttachment
from app.models.tenant import Tenant
from app.models.ticket import (
    MessageType,
    Ticket,
    TicketMessage,
    TicketPriority,
    TicketStatus,
)
from app.models.user import User, UserRole
from app.schemas.ticket import (
    TicketAttachmentOut,
    TicketCreate,
    TicketDetailOut,
    TicketMessageCreate,
    TicketMessageOut,
    TicketOut,
    TicketUpdate,
)

router = APIRouter()


def calculate_sla_due_date(priority: TicketPriority) -> datetime:
    now = datetime.now(timezone.utc)
    sla_map = {
        TicketPriority.URGENT: timedelta(hours=4),
        TicketPriority.HIGH: timedelta(hours=12),
        TicketPriority.MEDIUM: timedelta(hours=24),
        TicketPriority.LOW: timedelta(hours=48),
    }
    return now + sla_map.get(priority, timedelta(hours=24))


@router.post(
    "/",
    response_model=TicketOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new support ticket",
)
async def create_ticket(
    payload: TicketCreate,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    customer_id = current_user.id
    assigned_agent_id = None
    due_at = payload.due_at

    if current_user.role in [UserRole.TENANT_ADMIN, UserRole.MANAGER, UserRole.AGENT]:
        assigned_agent_id = payload.assigned_agent_id
        if payload.customer_id:
            cust_res = await db.execute(
                select(User).where(
                    User.id == payload.customer_id,
                    User.tenant_id == tenant.id,
                )
            )
            if not cust_res.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Customer not found in this organization.",
                )
            customer_id = payload.customer_id
    else:
        customer_id = current_user.id
        due_at = None

    if due_at is None:
        due_at = calculate_sla_due_date(payload.priority)

    new_ticket = Ticket(
        tenant_id=tenant.id,
        title=payload.title,
        description=payload.description,
        status=TicketStatus.OPEN,
        priority=payload.priority,
        channel=payload.channel,
        customer_id=customer_id,
        assigned_agent_id=assigned_agent_id,
        due_at=due_at,
    )

    db.add(new_ticket)
    await db.flush()

    result = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.customer), selectinload(Ticket.assigned_agent))
        .where(Ticket.id == new_ticket.id)
    )
    created_ticket = result.scalar_one()

    await ws_manager.broadcast_to_tenant(
        tenant_id=str(tenant.id),
        event_type="ticket_created",
        data={
            "ticket_id": str(created_ticket.id),
            "title": created_ticket.title,
            "priority": created_ticket.priority.value,
            "customer_name": created_ticket.customer.full_name,
        },
    )

    return created_ticket


@router.get(
    "/",
    response_model=List[TicketOut],
    summary="List tickets with filtering",
)
async def list_tickets(
    ticket_status: Optional[TicketStatus] = Query(None, alias="status"),
    priority: Optional[TicketPriority] = None,
    assigned_to_me: bool = Query(False, description="Filter tickets assigned to current user"),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Ticket)
        .options(selectinload(Ticket.customer), selectinload(Ticket.assigned_agent))
        .where(Ticket.tenant_id == tenant.id)
        .order_by(Ticket.created_at.desc())
    )

    if current_user.role == UserRole.CUSTOMER:
        query = query.where(Ticket.customer_id == current_user.id)
    else:
        if assigned_to_me:
            query = query.where(Ticket.assigned_agent_id == current_user.id)

    if ticket_status:
        query = query.where(Ticket.status == ticket_status)
    if priority:
        query = query.where(Ticket.priority == priority)

    result = await db.execute(query)
    return result.scalars().all()


@router.get(
    "/{ticket_id}",
    response_model=TicketDetailOut,
    summary="Get ticket details, conversation thread & attachments",
)
async def get_ticket(
    ticket_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Ticket)
        .options(
            selectinload(Ticket.customer),
            selectinload(Ticket.assigned_agent),
            selectinload(Ticket.messages).selectinload(TicketMessage.author),
            selectinload(Ticket.attachments).selectinload(TicketAttachment.uploader),
        )
        .where(Ticket.id == ticket_id, Ticket.tenant_id == tenant.id)
    )
    result = await db.execute(query)
    ticket = result.scalar_one_or_none()

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found.",
        )

    if current_user.role == UserRole.CUSTOMER and ticket.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this ticket.",
        )

    visible_messages = ticket.messages
    if current_user.role == UserRole.CUSTOMER:
        visible_messages = [
            m for m in ticket.messages if m.message_type == MessageType.PUBLIC_REPLY
        ]

    attachments_out = [
        TicketAttachmentOut(
            id=att.id,
            ticket_id=att.ticket_id,
            uploader=att.uploader,
            filename=att.filename,
            file_size=att.file_size,
            content_type=att.content_type,
            download_url=storage.generate_download_url(att.s3_key),
            created_at=att.created_at,
        )
        for att in ticket.attachments
    ]

    return TicketDetailOut(
        id=ticket.id,
        tenant_id=ticket.tenant_id,
        title=ticket.title,
        description=ticket.description,
        status=ticket.status,
        priority=ticket.priority,
        channel=ticket.channel,
        customer=ticket.customer,
        assigned_agent=ticket.assigned_agent,
        due_at=ticket.due_at,
        resolved_at=ticket.resolved_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        messages=visible_messages,
        attachments=attachments_out,
    )


@router.patch(
    "/{ticket_id}",
    response_model=TicketOut,
    summary="Update ticket status, priority, or assignee",
)
async def update_ticket(
    ticket_id: uuid.UUID,
    payload: TicketUpdate,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == UserRole.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customers cannot modify ticket metadata.",
        )

    result = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.customer), selectinload(Ticket.assigned_agent))
        .where(Ticket.id == ticket_id, Ticket.tenant_id == tenant.id)
    )
    ticket = result.scalar_one_or_none()

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found.",
        )

    if payload.title is not None:
        ticket.title = payload.title
    if payload.description is not None:
        ticket.description = payload.description
    if payload.priority is not None:
        ticket.priority = payload.priority
    if payload.assigned_agent_id is not None:
        agent_res = await db.execute(
            select(User).where(User.id == payload.assigned_agent_id, User.tenant_id == tenant.id)
        )
        if not agent_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assigned agent not found in this organization.",
            )
        ticket.assigned_agent_id = payload.assigned_agent_id

    if payload.due_at is not None:
        ticket.due_at = payload.due_at

    if payload.status is not None:
        ticket.status = payload.status
        if payload.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED]:
            ticket.resolved_at = datetime.now(timezone.utc)
        elif payload.status in [TicketStatus.OPEN, TicketStatus.IN_PROGRESS]:
            ticket.resolved_at = None

    db.add(ticket)
    await db.flush()

    fresh_ticket_res = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.customer), selectinload(Ticket.assigned_agent))
        .where(Ticket.id == ticket.id)
    )
    fresh_ticket = fresh_ticket_res.scalar_one()

    await ws_manager.broadcast_to_tenant(
        tenant_id=str(tenant.id),
        event_type="ticket_updated",
        data={
            "ticket_id": str(fresh_ticket.id),
            "status": fresh_ticket.status.value,
            "assigned_agent": fresh_ticket.assigned_agent.full_name if fresh_ticket.assigned_agent else None,
        },
    )

    return fresh_ticket


@router.post(
    "/{ticket_id}/messages",
    response_model=TicketMessageOut,
    status_code=status.HTTP_201_CREATED,
    summary="Post a reply or internal note to a ticket",
)
async def post_ticket_message(
    ticket_id: uuid.UUID,
    payload: TicketMessageCreate,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id, Ticket.tenant_id == tenant.id)
    )
    ticket = result.scalar_one_or_none()

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found.",
        )

    if current_user.role == UserRole.CUSTOMER and ticket.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this ticket.",
        )

    if current_user.role == UserRole.CUSTOMER and payload.message_type == MessageType.INTERNAL_NOTE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customers cannot post internal agent notes.",
        )

    message = TicketMessage(
        tenant_id=tenant.id,
        ticket_id=ticket.id,
        author_id=current_user.id,
        content=payload.content,
        message_type=payload.message_type,
    )
    db.add(message)

    if current_user.role == UserRole.CUSTOMER and ticket.status in [
        TicketStatus.WAITING,
        TicketStatus.RESOLVED,
    ]:
        ticket.status = TicketStatus.IN_PROGRESS
        db.add(ticket)

    await db.flush()

    msg_result = await db.execute(
        select(TicketMessage)
        .options(selectinload(TicketMessage.author))
        .where(TicketMessage.id == message.id)
    )
    saved_msg = msg_result.scalar_one()

    await ws_manager.broadcast_to_ticket(
        ticket_id=str(ticket.id),
        event_type="new_message",
        data={
            "ticket_id": str(ticket.id),
            "message_id": str(saved_msg.id),
            "author_name": saved_msg.author.full_name,
            "content": saved_msg.content,
            "message_type": saved_msg.message_type.value,
            "created_at": saved_msg.created_at.isoformat(),
        },
    )

    return saved_msg


# ==========================================
# Cloud File Attachments (AWS S3)
# ==========================================

@router.post(
    "/{ticket_id}/attachments",
    response_model=TicketAttachmentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file or photo attachment to a ticket (AWS S3)",
)
async def upload_ticket_attachment(
    ticket_id: uuid.UUID,
    file: UploadFile = File(...),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Uploads a file (photo, PDF, diagnostic logs) to AWS S3 and links it to the ticket.
    """
    # 1. Verify ticket belongs to tenant
    result = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id, Ticket.tenant_id == tenant.id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found.",
        )

    # Customers can only upload to their own tickets
    if current_user.role == UserRole.CUSTOMER and ticket.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this ticket.",
        )

    # 2. Read file bytes and size
    file_bytes = await file.read()
    file_size = len(file_bytes)
    content_type = file.content_type or "application/octet-stream"

    # Enforce 15MB limit
    if file_size > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum limit of 15MB.",
        )

    # 3. Upload to AWS S3 (or local fallback)
    attachment_uuid = uuid.uuid4()
    s3_key = f"tenants/{tenant.id}/tickets/{ticket.id}/{attachment_uuid}_{file.filename}"
    storage.upload_file(file_bytes, s3_key, content_type)

    # 4. Save record in database
    attachment = TicketAttachment(
        id=attachment_uuid,
        tenant_id=tenant.id,
        ticket_id=ticket.id,
        uploader_id=current_user.id,
        filename=file.filename,
        file_size=file_size,
        content_type=content_type,
        s3_key=s3_key,
    )
    db.add(attachment)
    await db.flush()

    download_url = storage.generate_download_url(s3_key)

    # Re-fetch with uploader loaded
    att_res = await db.execute(
        select(TicketAttachment)
        .options(selectinload(TicketAttachment.uploader))
        .where(TicketAttachment.id == attachment.id)
    )
    saved_att = att_res.scalar_one()

    return TicketAttachmentOut(
        id=saved_att.id,
        ticket_id=saved_att.ticket_id,
        uploader=saved_att.uploader,
        filename=saved_att.filename,
        file_size=saved_att.file_size,
        content_type=saved_att.content_type,
        download_url=download_url,
        created_at=saved_att.created_at,
    )


@router.get(
    "/attachments/download/{filename}",
    include_in_schema=False,
    summary="Download local attachment fallback",
)
async def download_local_attachment(filename: str):
    file_path = settings.LOCAL_UPLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Attachment file not found.")
    return FileResponse(file_path, filename=filename)
