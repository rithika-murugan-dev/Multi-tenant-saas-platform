import time
from fastapi import Request, Response
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)
from starlette.middleware.base import BaseHTTPMiddleware

# ==========================================
# Prometheus Metrics Definitions
# ==========================================

HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total count of HTTP requests processed by FastAPI",
    ["method", "endpoint", "status_code"],
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "Histogram of HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
)

ACTIVE_WEBSOCKETS_GAUGE = Gauge(
    "active_websocket_connections_total",
    "Current number of live connected WebSocket clients",
)

ACTIVE_TICKETS_GAUGE = Gauge(
    "active_tickets_total",
    "Total number of unresolved tickets (open or in progress)",
)


class PrometheusMiddleware(BaseHTTPMiddleware):
    """
    Middleware that automatically measures latency and request counts
    for every API call made to the server.
    """
    async def dispatch(self, request: Request, call_next):
        # Exclude metrics endpoint itself from recursion
        if request.url.path == "/metrics":
            return await call_next(request)

        method = request.method
        endpoint = request.url.path
        start_time = time.time()

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception:
            status_code = 500
            raise
        finally:
            duration = time.time() - start_time
            # Record metrics
            HTTP_REQUESTS_TOTAL.labels(
                method=method,
                endpoint=endpoint,
                status_code=status_code,
            ).inc()

            HTTP_REQUEST_DURATION_SECONDS.labels(
                method=method,
                endpoint=endpoint,
            ).observe(duration)

        return response


def get_prometheus_metrics() -> Response:
    """Returns the plain-text Prometheus metrics scrape payload."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )
