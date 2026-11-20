# backend/app/routers/performance.py
"""Employee performance analytics with transparent, configurable formulas."""
from collections import defaultdict, OrderedDict
from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.models import Task, Timesheet, User, Project
from backend.app.core.deps import get_current_user
from backend.app.core.work_categories import DONE_STATUSES

router = APIRouter(prefix="/api/performance", tags=["performance"])

DONE = DONE_STATUSES

# Transparent weights for the composite productivity score
W_COMPLETION = 0.5
W_SUBMISSION = 0.2
W_EFFICIENCY = 0.3
MONTHLY_TARGET_DAYS = 22     # expected working days for submission-rate baseline


def _is_overdue(t: Task) -> bool:
    if t.status in DONE or not t.end_date:
        return False
    try:
        return datetime.strptime(t.end_date, "%Y-%m-%d").date() < date.today()
    except Exception:
        return False


def _in_range(d: str, dfrom: Optional[str], dto: Optional[str]) -> bool:
    if not d:
        return True
    if dfrom and d < dfrom:
        return False
    if dto and d > dto:
        return False
    return True


def _metrics_for(db, user, project_id, dfrom, dto, status):
    tq = db.query(Task).filter(Task.assigned_to == user.id)
    if project_id:
        tq = tq.filter(Task.project_id == project_id)
    tasks = tq.all()
    if status and status not in ("All", ""):
        tasks = [t for t in tasks if t.status == status]
    if dfrom or dto:
        tasks = [t for t in tasks if _in_range(t.end_date, dfrom, dto)]

    total = len(tasks)
    completed = [t for t in tasks if t.status in DONE]
    overdue = [t for t in tasks if _is_overdue(t)]
    pending = [t for t in tasks if t.status not in DONE]
    completion_rate = round(len(completed) / total * 100) if total else 0

    tsq = db.query(Timesheet).filter(Timesheet.user_id == user.id)
    if project_id:
        tsq = tsq.filter(Timesheet.project_id == project_id)
    timesheets = [ts for ts in tsq.all() if _in_range(ts.work_date, dfrom, dto)]
    logged = round(sum((ts.total_hours or 0) for ts in timesheets), 1)
    distinct_days = len({ts.work_date for ts in timesheets if ts.work_date})
    avg_per_day = round(logged / distinct_days, 1) if distinct_days else 0
    submission_rate = min(100, round(distinct_days / MONTHLY_TARGET_DAYS * 100))

    # efficiency: estimated vs logged on completed work (capped at 100)
    est = sum((t.estimated_hours or 0) for t in completed)
    efficiency = min(100, round(est / logged * 100)) if logged else (100 if completed else 0)
    completion_efficiency = round(len(completed) / total * 100) if total else 0

    score = round(W_COMPLETION * completion_rate + W_SUBMISSION * submission_rate + W_EFFICIENCY * efficiency)

    # task-wise time
    task_time = defaultdict(float)
    for ts in timesheets:
        if ts.task_id:
            task_time[ts.task_id] += (ts.total_hours or 0)

    return {
        "employeeId": user.id, "employeeName": user.name, "department": user.department,
        "tasks": {
            "totalAssigned": total, "completed": len(completed), "pending": len(pending),
            "overdue": len(overdue), "completionRate": completion_rate,
        },
        "timesheets": {
            "loggedHours": logged, "avgHoursPerDay": avg_per_day,
            "submissionRate": submission_rate, "count": len(timesheets),
            "taskWise": [{"taskId": k, "hours": round(v, 1)} for k, v in task_time.items()],
        },
        "productivity": {
            "completionEfficiency": completion_efficiency, "efficiency": efficiency,
            "dailyProductivity": round(len(completed) / distinct_days, 2) if distinct_days else 0,
            "score": score,
        },
    }


def _monthly_trend(db, user_id=None):
    q = db.query(Task).filter(Task.completed_at.isnot(None))
    if user_id:
        q = q.filter(Task.assigned_to == user_id)
    buckets = OrderedDict()
    for t in q.all():
        key = t.completed_at.strftime("%Y-%m")
        buckets[key] = buckets.get(key, 0) + 1
    return [{"period": k, "completed": v} for k, v in sorted(buckets.items())]


@router.get("")
def performance(employeeId: Optional[str] = None, projectId: Optional[str] = None,
                dateFrom: Optional[str] = None, dateTo: Optional[str] = None,
                status: Optional[str] = None,
                current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Workers only see themselves
    if current_user.role == "Worker":
        workers = [current_user]
    elif employeeId:
        u = db.query(User).filter(User.id == employeeId).first()
        workers = [u] if u else []
    else:
        workers = db.query(User).filter(User.role == "Worker").all()

    rows = [_metrics_for(db, u, projectId, dateFrom, dateTo, status) for u in workers]
    trend = _monthly_trend(db, employeeId if current_user.role != "Worker" else current_user.id)
    return {"employees": rows, "trend": trend,
            "formula": {
                "completionRate": "completed / total assigned tasks",
                "avgHoursPerDay": "logged hours / distinct days with timesheets",
                "submissionRate": f"distinct timesheet days / {MONTHLY_TARGET_DAYS} target days",
                "score": f"{W_COMPLETION}*completionRate + {W_SUBMISSION}*submissionRate + {W_EFFICIENCY}*efficiency",
            }}
