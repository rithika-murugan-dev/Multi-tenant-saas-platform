from datetime import datetime, timezone
from typing import Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_tenant, get_current_user, get_db, require_roles
from app.models.task import Task, TaskStatus
from app.models.tenant import Tenant
from app.models.ticket import Ticket, TicketPriority, TicketStatus
from app.models.user import User, UserRole
from app.schemas.analytics import (
    AgentPerformance,
    AnalyticsOverview,
    PriorityDistribution,
    StatusDistribution,
)

router = APIRouter()


@router.get(
    "/overview",
    response_model=AnalyticsOverview,
    summary="Get executive business analytics & performance KPIs",
)
async def get_analytics_overview(
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_roles(UserRole.TENANT_ADMIN, UserRole.MANAGER)),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns real-time executive analytics strictly for the current organization:
    - Helpdesk KPIs: Total, Open, Resolved, SLA Compliance Rate, Avg Resolution Time.
    - Distributions: Priority and Status breakdowns.
    - Operations KPIs: Total tasks, Completed tasks, Total logged hours.
    - Agent Leaderboard: Ranking staff by tickets resolved and hours logged.
    """
    # 1. Fetch all tickets for tenant
    ticket_query = select(Ticket).where(Ticket.tenant_id == tenant.id)
    ticket_res = await db.execute(ticket_query)
    all_tickets = ticket_res.scalars().all()

    # 2. Fetch all tasks for tenant
    task_query = select(Task).where(Task.tenant_id == tenant.id)
    task_res = await db.execute(task_query)
    all_tasks = task_res.scalars().all()

    # 3. Fetch all staff members (Admins, Managers, Agents)
    staff_query = select(User).where(
        User.tenant_id == tenant.id,
        User.role != UserRole.CUSTOMER,
    )
    staff_res = await db.execute(staff_query)
    staff_members = staff_res.scalars().all()

    # Compute Helpdesk Metrics
    total_tickets = len(all_tickets)
    open_tickets = sum(1 for t in all_tickets if t.status in [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING])
    resolved_tickets = sum(1 for t in all_tickets if t.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED])

    # SLA Compliance Calculation
    tickets_with_sla = [t for t in all_tickets if t.due_at is not None and t.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED]]
    if tickets_with_sla:
        compliant_count = sum(1 for t in tickets_with_sla if t.resolved_at and t.resolved_at <= t.due_at)
        sla_compliance_rate = round((compliant_count / len(tickets_with_sla)) * 100.0, 1)
    else:
        sla_compliance_rate = 100.0  # Perfect compliance if no tickets missed deadline yet

    # Average Resolution Time Calculation (in hours)
    resolved_with_time = [t for t in all_tickets if t.resolved_at and t.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED]]
    if resolved_with_time:
        total_seconds = sum((t.resolved_at - t.created_at).total_seconds() for t in resolved_with_time)
        avg_resolution_time_hours = round((total_seconds / len(resolved_with_time)) / 3600.0, 1)
    else:
        avg_resolution_time_hours = 0.0

    # Priority & Status Distributions
    priority_dist = PriorityDistribution(
        urgent=sum(1 for t in all_tickets if t.priority == TicketPriority.URGENT),
        high=sum(1 for t in all_tickets if t.priority == TicketPriority.HIGH),
        medium=sum(1 for t in all_tickets if t.priority == TicketPriority.MEDIUM),
        low=sum(1 for t in all_tickets if t.priority == TicketPriority.LOW),
    )

    status_dist = StatusDistribution(
        open=sum(1 for t in all_tickets if t.status == TicketStatus.OPEN),
        in_progress=sum(1 for t in all_tickets if t.status == TicketStatus.IN_PROGRESS),
        waiting=sum(1 for t in all_tickets if t.status == TicketStatus.WAITING),
        resolved=sum(1 for t in all_tickets if t.status == TicketStatus.RESOLVED),
        closed=sum(1 for t in all_tickets if t.status == TicketStatus.CLOSED),
    )

    # Compute Operations (Jira) Metrics
    total_tasks = len(all_tasks)
    completed_tasks = sum(1 for task in all_tasks if task.status == TaskStatus.DONE)
    total_logged_hours = round(sum(task.logged_hours for task in all_tasks), 1)

    # Compute Agent Leaderboard
    leaderboard: List[AgentPerformance] = []
    for staff in staff_members:
        agent_assigned = sum(1 for t in all_tickets if t.assigned_agent_id == staff.id)
        agent_resolved = sum(1 for t in all_tickets if t.assigned_agent_id == staff.id and t.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED])
        agent_completed_tasks = sum(1 for task in all_tasks if task.assignee_id == staff.id and task.status == TaskStatus.DONE)
        agent_logged_hours = round(sum(task.logged_hours for task in all_tasks if task.assignee_id == staff.id), 1)

        leaderboard.append(
            AgentPerformance(
                agent_id=staff.id,
                full_name=staff.full_name,
                email=staff.email,
                tickets_assigned=agent_assigned,
                tickets_resolved=agent_resolved,
                tasks_completed=agent_completed_tasks,
                total_logged_hours=agent_logged_hours,
            )
        )

    # Sort leaderboard by tickets resolved desc, then logged hours desc
    leaderboard.sort(key=lambda a: (a.tickets_resolved, a.total_logged_hours), reverse=True)

    return AnalyticsOverview(
        total_tickets=total_tickets,
        open_tickets=open_tickets,
        resolved_tickets=resolved_tickets,
        sla_compliance_rate=sla_compliance_rate,
        avg_resolution_time_hours=avg_resolution_time_hours,
        tickets_by_priority=priority_dist,
        tickets_by_status=status_dist,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        total_logged_hours=total_logged_hours,
        agent_leaderboard=leaderboard,
    )
