"""Remove all demo data created by seed_demo.py.

Every demo row uses a `DEMO-` id/code prefix, and demo leads/notifications are
linked to demo tasks, so this deletes only demo data and never touches existing
records. Run:  python backend/scripts/unseed_demo.py
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, ROOT)

from backend.app.db.database import SessionLocal
from backend.app.models.models import (
    Project, ProjectMember, Task, Lead, Timesheet, Notification,
)

PREFIX = "DEMO-%"


def unseed(db):
    """Delete demo rows in FK-safe order. Returns a dict of row counts removed."""
    removed = {}
    # Leads + notifications hang off demo tasks (delete before the tasks).
    removed["leads"] = db.query(Lead).filter(Lead.task_id.like(PREFIX)).delete(synchronize_session=False)
    removed["notifications"] = db.query(Notification).filter(Notification.task_id.like(PREFIX)).delete(synchronize_session=False)
    removed["timesheets"] = db.query(Timesheet).filter(Timesheet.id.like(PREFIX)).delete(synchronize_session=False)
    removed["tasks"] = db.query(Task).filter(Task.id.like(PREFIX)).delete(synchronize_session=False)
    removed["members"] = db.query(ProjectMember).filter(ProjectMember.id.like(PREFIX)).delete(synchronize_session=False)
    removed["projects"] = db.query(Project).filter(Project.id.like(PREFIX)).delete(synchronize_session=False)
    db.commit()
    return removed


if __name__ == "__main__":
    db = SessionLocal()
    try:
        removed = unseed(db)
        print("Removed demo data:", removed)
    finally:
        db.close()
