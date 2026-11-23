import uuid
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class PriorityDistribution(BaseModel):
    urgent: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class StatusDistribution(BaseModel):
    open: int = 0
    in_progress: int = 0
    waiting: int = 0
    resolved: int = 0
    closed: int = 0


class AgentPerformance(BaseModel):
    agent_id: uuid.UUID
    full_name: str
    email: str
    tickets_assigned: int
    tickets_resolved: int
    tasks_completed: int
    total_logged_hours: float

    model_config = ConfigDict(from_attributes=True)


class AnalyticsOverview(BaseModel):
    # Helpdesk KPIs
    total_tickets: int
    open_tickets: int
    resolved_tickets: int
    sla_compliance_rate: float        # Percentage e.g. 94.5%
    avg_resolution_time_hours: float  # In hours e.g. 3.2h
    tickets_by_priority: PriorityDistribution
    tickets_by_status: StatusDistribution

    # Operations & Jira KPIs
    total_tasks: int
    completed_tasks: int
    total_logged_hours: float

    # Team & Agent Leaderboard
    agent_leaderboard: List[AgentPerformance]
