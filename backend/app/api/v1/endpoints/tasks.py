import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.api.deps import get_current_tenant, get_current_user, get_db, require_roles
from app.core.websockets import ws_manager
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.tenant import Tenant
from app.models.ticket import Ticket
from app.models.user import User, UserRole
from app.schemas.task import KanbanBoardOut, TaskCreate, TaskOut, TaskUpdate

router = APIRouter()


@router.post(
    "/",
    response_model=TaskOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create an internal task (optionally linked to a ticket)",
)
async def create_task(
    payload: TaskCreate,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_roles(UserRole.TENANT_ADMIN, UserRole.MANAGER, UserRole.AGENT)),
    db: AsyncSession = Depends(get_db),
):
    if payload.ticket_id:
        ticket_res = await db.execute(
            select(Ticket).where(
                Ticket.id == payload.ticket_id,
                Ticket.tenant_id == tenant.id,
            )
        )
        if not ticket_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Linked ticket not found in this organization.",
            )

    if payload.assignee_id:
        user_res = await db.execute(
            select(User).where(
                User.id == payload.assignee_id,
                User.tenant_id == tenant.id,
            )
        )
        if not user_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assigned employee not found in this organization.",
            )

    new_task = Task(
        tenant_id=tenant.id,
        creator_id=current_user.id,
        assignee_id=payload.assignee_id,
        ticket_id=payload.ticket_id,
        title=payload.title,
        description=payload.description,
        status=TaskStatus.TODO,
        priority=payload.priority,
        due_date=payload.due_date,
        estimated_hours=payload.estimated_hours,
        logged_hours=0.0,
    )
    db.add(new_task)
    await db.flush()

    result = await db.execute(
        select(Task)
        .options(
            selectinload(Task.creator),
            selectinload(Task.assignee),
            selectinload(Task.ticket),
        )
        .where(Task.id == new_task.id)
    )
    created_task = result.scalar_one()

    # Real-time WebSocket: Broadcast new task to company Kanban board
    await ws_manager.broadcast_to_tenant(
        tenant_id=str(tenant.id),
        event_type="task_created",
        data={
            "task_id": str(created_task.id),
            "title": created_task.title,
            "status": created_task.status.value,
            "assignee": created_task.assignee.full_name if created_task.assignee else None,
        },
    )

    return created_task


@router.get(
    "/",
    response_model=List[TaskOut],
    summary="List all internal tasks with filters",
)
async def list_tasks(
    task_status: Optional[TaskStatus] = Query(None, alias="status"),
    priority: Optional[TaskPriority] = None,
    ticket_id: Optional[uuid.UUID] = None,
    assigned_to_me: bool = Query(False, description="Filter tasks assigned to current user"),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_roles(UserRole.TENANT_ADMIN, UserRole.MANAGER, UserRole.AGENT)),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Task)
        .options(
            selectinload(Task.creator),
            selectinload(Task.assignee),
            selectinload(Task.ticket),
        )
        .where(Task.tenant_id == tenant.id)
        .order_by(Task.created_at.desc())
    )

    if assigned_to_me:
        query = query.where(Task.assignee_id == current_user.id)
    if task_status:
        query = query.where(Task.status == task_status)
    if priority:
        query = query.where(Task.priority == priority)
    if ticket_id:
        query = query.where(Task.ticket_id == ticket_id)

    result = await db.execute(query)
    return result.scalars().all()


@router.get(
    "/kanban",
    response_model=KanbanBoardOut,
    summary="Get tasks structured for Kanban board columns",
)
async def get_kanban_board(
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_roles(UserRole.TENANT_ADMIN, UserRole.MANAGER, UserRole.AGENT)),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Task)
        .options(
            selectinload(Task.creator),
            selectinload(Task.assignee),
            selectinload(Task.ticket),
        )
        .where(Task.tenant_id == tenant.id)
        .order_by(Task.updated_at.desc())
    )
    result = await db.execute(query)
    all_tasks = result.scalars().all()

    board = KanbanBoardOut()
    for task in all_tasks:
        if task.status == TaskStatus.TODO:
            board.todo.append(task)
        elif task.status == TaskStatus.IN_PROGRESS:
            board.in_progress.append(task)
        elif task.status == TaskStatus.IN_REVIEW:
            board.in_review.append(task)
        elif task.status == TaskStatus.DONE:
            board.done.append(task)
        elif task.status == TaskStatus.CANCELLED:
            board.cancelled.append(task)

    return board


@router.get(
    "/{task_id}",
    response_model=TaskOut,
    summary="Get single task details",
)
async def get_task(
    task_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_roles(UserRole.TENANT_ADMIN, UserRole.MANAGER, UserRole.AGENT)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Task)
        .options(
            selectinload(Task.creator),
            selectinload(Task.assignee),
            selectinload(Task.ticket),
        )
        .where(Task.id == task_id, Task.tenant_id == tenant.id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found in this organization.",
        )
    return task


@router.patch(
    "/{task_id}",
    response_model=TaskOut,
    summary="Update task status (drag & drop), priority, or logged hours",
)
async def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdate,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_roles(UserRole.TENANT_ADMIN, UserRole.MANAGER, UserRole.AGENT)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Task)
        .options(
            selectinload(Task.creator),
            selectinload(Task.assignee),
            selectinload(Task.ticket),
        )
        .where(Task.id == task_id, Task.tenant_id == tenant.id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    if payload.title is not None:
        task.title = payload.title
    if payload.description is not None:
        task.description = payload.description
    if payload.priority is not None:
        task.priority = payload.priority
    if payload.due_date is not None:
        task.due_date = payload.due_date
    if payload.estimated_hours is not None:
        task.estimated_hours = payload.estimated_hours
    if payload.logged_hours is not None:
        task.logged_hours = payload.logged_hours

    if payload.assignee_id is not None:
        user_res = await db.execute(
            select(User).where(User.id == payload.assignee_id, User.tenant_id == tenant.id)
        )
        if not user_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assigned employee not found in this organization.",
            )
        task.assignee_id = payload.assignee_id

    # Handle Kanban status transition
    if payload.status is not None:
        task.status = payload.status
        if payload.status == TaskStatus.DONE:
            task.completed_at = datetime.now(timezone.utc)
        elif task.status != TaskStatus.DONE:
            task.completed_at = None

    db.add(task)
    await db.flush()

    # Re-fetch with fresh relationships
    updated_res = await db.execute(
        select(Task)
        .options(
            selectinload(Task.creator),
            selectinload(Task.assignee),
            selectinload(Task.ticket),
        )
        .where(Task.id == task.id)
    )
    updated_task = updated_res.scalar_one()

    # Real-time WebSocket: Broadcast card movement across company Kanban boards
    await ws_manager.broadcast_to_tenant(
        tenant_id=str(tenant.id),
        event_type="task_status_changed",
        data={
            "task_id": str(updated_task.id),
            "title": updated_task.title,
            "status": updated_task.status.value,
            "completed_at": updated_task.completed_at.isoformat() if updated_task.completed_at else None,
        },
    )

    return updated_task


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a task (Managers/Admins only)",
)
async def delete_task(
    task_id: uuid.UUID,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_roles(UserRole.TENANT_ADMIN, UserRole.MANAGER)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.tenant_id == tenant.id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
    await db.delete(task)
