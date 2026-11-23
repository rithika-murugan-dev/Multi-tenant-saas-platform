import time
from datetime import datetime, timezone
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.email import send_real_email
from app.models.ticket import Ticket, TicketStatus
from app.worker.celery_app import celery_app

sync_engine = create_engine(
    settings.SYNC_SQLALCHEMY_DATABASE_URI,
    pool_pre_ping=True,
)


@celery_app.task(name="app.worker.tasks.send_email_notification")
def send_email_notification(recipient: str, subject: str, message: str) -> dict:
    """
    Sends a real transactional email in the background via SMTP (e.g. Gmail / SES).
    """
    success = send_real_email(recipient=recipient, subject=subject, body_text=message)
    return {
        "status": "delivered" if success else "simulated",
        "recipient": recipient,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@celery_app.task(name="app.worker.tasks.check_sla_breaches")
def check_sla_breaches() -> dict:
    now = datetime.now(timezone.utc)
    breached_tickets = []

    with Session(sync_engine) as session:
        query = select(Ticket).where(
            Ticket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS]),
            Ticket.due_at != None,
            Ticket.due_at < now,
        )
        results = session.execute(query).scalars().all()

        for ticket in results:
            breached_tickets.append({
                "ticket_id": str(ticket.id),
                "title": ticket.title,
                "due_at": ticket.due_at.isoformat() if ticket.due_at else None,
                "tenant_id": str(ticket.tenant_id),
            })
            print(
                f"[SLA Breach Alert] ⚠️ Ticket #{ticket.id} ('{ticket.title}') has breached its SLA deadline!"
            )

    return {
        "checked_at": now.isoformat(),
        "breaches_found": len(breached_tickets),
        "breached_tickets": breached_tickets,
    }
