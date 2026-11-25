from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import Base, engine
from app.core.metrics import PrometheusMiddleware, get_prometheus_metrics
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

# Prometheus metrics middleware to measure latency and request rates
app.add_middleware(PrometheusMiddleware)

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


# Prometheus Scrape Endpoint
@app.get("/metrics", include_in_schema=False)
async def metrics_endpoint():
    """Prometheus metrics scrape target."""
    return get_prometheus_metrics()


# Interactive live WebSocket monitor test UI
@app.get("/ws-test", include_in_schema=False)
async def ws_test_ui():
    static_file = Path(__file__).resolve().parent / "static" / "ws_client.html"
    return FileResponse(static_file)


# Attach API routes under /api/v1
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
    }
