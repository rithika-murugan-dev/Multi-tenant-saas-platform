from fastapi import APIRouter
from app.api.v1.endpoints import (
    analytics,
    auth,
    tasks,
    tenants,
    tickets,
    users,
    websockets,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Onboarding"])
api_router.include_router(tenants.router, prefix="/tenants", tags=["Tenant Organizations"])
api_router.include_router(users.router, prefix="/users", tags=["User & Team Management"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["Helpdesk Tickets"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Business Operations & Tasks"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Executive Analytics & Reporting"])
api_router.include_router(websockets.router, prefix="/ws", tags=["Real-Time WebSockets"])
