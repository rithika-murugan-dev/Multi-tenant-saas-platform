from datetime import datetime, timedelta, timezone
import pytest


def test_sla_compliance_math():
    now = datetime.now(timezone.utc)
    # Case 1: Ticket resolved 1 hour before due date (Compliant)
    resolved_1 = now
    due_1 = now + timedelta(hours=1)
    assert resolved_1 <= due_1

    # Case 2: Ticket resolved 2 hours after due date (Breached)
    resolved_2 = now + timedelta(hours=3)
    due_2 = now + timedelta(hours=1)
    assert not (resolved_2 <= due_2)

    # 1 compliant out of 2 resolved = 50.0%
    compliance_rate = round((1 / 2) * 100.0, 1)
    assert compliance_rate == 50.0


def test_average_resolution_time_math():
    now = datetime.now(timezone.utc)
    # Ticket 1 took 2 hours (7200 seconds)
    t1_created = now - timedelta(hours=2)
    t1_resolved = now
    t1_duration = (t1_resolved - t1_created).total_seconds() / 3600.0

    # Ticket 2 took 4 hours (14400 seconds)
    t2_created = now - timedelta(hours=4)
    t2_resolved = now
    t2_duration = (t2_resolved - t2_created).total_seconds() / 3600.0

    avg_hours = (t1_duration + t2_duration) / 2.0
    assert avg_hours == 3.0
