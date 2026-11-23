from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.worker.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Periodic beat schedule (e.g. check SLA every 60 seconds)
    beat_schedule={
        "check-sla-breaches-every-minute": {
            "task": "app.worker.tasks.check_sla_breaches",
            "schedule": 60.0,
        },
    },
)
