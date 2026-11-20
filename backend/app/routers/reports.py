# backend/app/routers/reports.py
from collections import OrderedDict
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.models import Task, Project, User, Timesheet
from backend.app.core.deps import require_roles
from backend.app.core.work_categories import DONE_STATUSES

router = APIRouter(prefix="/api/reports", tags=["Reports"])

DONE = DONE_STATUSES


@router.get("/effort")
def get_project_effort_report(current_user: User = Depends(require_roles(["Admin", "Master"])),
                              db: Session = Depends(get_db)):
    result = []
    for p in db.query(Project).all():
        tasks = db.query(Task).filter(Task.project_id == p.id).all()
        total = len(tasks)
        completed = len([t for t in tasks if t.status in DONE])
        planned = sum((t.estimated_hours or 0) for t in tasks)
        actual = sum((ts.total_hours or 0) for ts in
                     db.query(Timesheet).filter(Timesheet.project_id == p.id).all())
        rate = int(completed / total * 100) if total else 0
        result.append({
            "projectName": p.name,
            "plannedHours": round(planned, 1),
            "actualHours": round(actual, 1),
            "completionRate": rate,
        })
    return result


@router.get("/utilization")
def get_utilization_report(current_user: User = Depends(require_roles(["Admin", "Master"])),
                           db: Session = Depends(get_db)):
    result = []
    for u in db.query(User).filter(User.role == "Worker").all():
        tasks = db.query(Task).filter(Task.assigned_to == u.id).all()
        total = len(tasks)
        completed = len([t for t in tasks if t.status in DONE])
        in_progress = len([t for t in tasks if t.status == "In Progress"])
        logged = sum((ts.total_hours or 0) for ts in
                     db.query(Timesheet).filter(Timesheet.user_id == u.id).all())
        # Utilization = logged hours vs a nominal 40h/week capacity (transparent formula)
        rate = min(100, int(logged / 40 * 100)) if logged else 0
        result.append({
            "employeeName": u.name,
            "role": u.role,
            "totalTasks": total,
            "openTasks": max(0, total - completed - in_progress),
            "inProgressTasks": in_progress,
            "completedTasks": completed,
            "loggedHours": round(logged, 1),
            "utilizationRate": rate,
        })
    return result


@router.get("/productivity")
def get_productivity_report(current_user: User = Depends(require_roles(["Admin", "Master"])),
                            db: Session = Depends(get_db)):
    # Real monthly completed-task counts from completed_at (last 6 months present in data)
    buckets = OrderedDict()
    for t in db.query(Task).filter(Task.completed_at.isnot(None)).all():
        key = t.completed_at.strftime("%Y-%m")
        buckets[key] = buckets.get(key, 0) + 1
    if not buckets:
        buckets[datetime.utcnow().strftime("%Y-%m")] = 0
    return [{"period": k, "completedTasks": v} for k, v in sorted(buckets.items())]
