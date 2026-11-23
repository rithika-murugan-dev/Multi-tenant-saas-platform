from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy import func, select
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import AsyncSessionLocal, Base, engine
from app.core.websockets import ws_manager
from app.models.task import Task
from app.models.tenant import Tenant
from app.models.ticket import Ticket
from app.models.user import User
from init_db import create_database_if_not_exists


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Automatically ensure the database exists
    await create_database_if_not_exists()

    # 2. Ensure all tables (tenants, users, tickets, tasks, etc.) exist
    async with engine.begin() as conn:
        import app.models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    # 3. Shutdown: dispose DB connection pool cleanly
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration for Frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redirect root URL and /api/v1/docs directly to /docs
@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


@app.get(f"{settings.API_V1_STR}/docs", include_in_schema=False)
async def api_v1_docs():
    return RedirectResponse(url="/docs")


# Interactive live WebSocket monitor test UI
@app.get("/ws-test", include_in_schema=False)
async def ws_test_ui():
    static_file = Path(__file__).resolve().parent / "static" / "ws_client.html"
    return FileResponse(static_file)


# Prometheus Metrics Exporter Endpoint
@app.get("/metrics", tags=["Monitoring"], summary="Prometheus Metrics Exporter")
async def prometheus_metrics():
    """
    Exposes platform telemetry in standard Prometheus text format:
    - Total tenants, users, tickets, tasks.
    - Live active WebSocket connections.
    """
    async with AsyncSessionLocal() as session:
        t_count = await session.scalar(select(func.count(Tenant.id))) or 0
        u_count = await session.scalar(select(func.count(User.id))) or 0
        tick_count = await session.scalar(select(func.count(Ticket.id))) or 0
        task_count = await session.scalar(select(func.count(Task.id))) or 0

    total_ws = sum(len(conns) for conns in ws_manager.active_tenant_connections.values())

    metrics_text = (
        "# HELP saas_platform_info Application metadata\n"
        "# TYPE saas_platform_info gauge\n"
        'saas_platform_info{version="1.0.0",env="production"} 1\n\n'
        "# HELP saas_tenants_total Total registered company tenants\n"
        "# TYPE saas_tenants_total gauge\n"
        f"saas_tenants_total {t_count}\n\n"
        "# HELP saas_users_total Total users across all tenants\n"
        "# TYPE saas_users_total gauge\n"
        f"saas_users_total {u_count}\n\n"
        "# HELP saas_tickets_total Total tickets created\n"
        "# TYPE saas_tickets_total gauge\n"
        f"saas_tickets_total {tick_count}\n\n"
        "# HELP saas_tasks_total Total business operations tasks\n"
        "# TYPE saas_tasks_total gauge\n"
        f"saas_tasks_total {task_count}\n\n"
        "# HELP saas_active_websocket_connections Current live connected WebSocket streams\n"
        "# TYPE saas_active_websocket_connections gauge\n"
        f"saas_active_websocket_connections {total_ws}\n"
    )

    return Response(content=metrics_text, media_type="text/plain; version=0.0.4; charset=utf-8")


# Attach API routes under /api/v1
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
    }
