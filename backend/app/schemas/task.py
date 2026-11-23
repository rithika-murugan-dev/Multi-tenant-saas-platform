import uuid
from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.task import TaskPriority, TaskStatus
from app.models.ticket import TicketStatus
from app.schemas.ticket import UserSummary


class TicketSummary(BaseModel):
    id: uuid.UUID
    title: str
    status: TicketStatus

    model_config = ConfigDict(from_attributes=True)


class TaskBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = Field(None, ge=0)


class TaskCreate(TaskBase):
    ticket_id: Optional[uuid.UUID] = None
    assignee_id: Optional[uuid.UUID] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assignee_id: Optional[uuid.UUID] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = Field(None, ge=0)
    logged_hours: Optional[float] = Field(None, ge=0)


class TaskOut(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    title: str
    description: Optional[str] = None
    status: TaskStatus
    priority: TaskPriority
    ticket: Optional[TicketSummary] = None
    creator: UserSummary
    assignee: Optional[UserSummary] = None
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    logged_hours: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class KanbanBoardOut(BaseModel):
    todo: List[TaskOut] = []
    in_progress: List[TaskOut] = []
    in_review: List[TaskOut] = []
    done: List[TaskOut] = []
    cancelled: List[TaskOut] = []
