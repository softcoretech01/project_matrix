# backend/app/routers/dashboard.py
"""Live dashboard aggregations. Role-aware: Admin/Master see everything,
Worker sees only their own assigned work."""
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.models import (
    User, Project, Task, Timesheet, ProjectMember, Notification, IdleTimeLog,
)
from backend.app.core.deps import get_current_user
from backend.app.core.work_categories import DONE_STATUSES, CATEGORY_BY_KEY

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

DONE = DONE_STATUSES
TODAY = lambda: date.today().isoformat()


def _is_overdue(t: Task) -> bool:
    if t.status in DONE or not t.end_date:
        return False
    try:
        return datetime.strptime(t.end_date, "%Y-%m-%d").date() < date.today()
    except Exception:
        return False


def _worker_scope(query, model_attr, user):
    """Limit a Task query to the worker's own tasks."""
    return query.filter(model_attr == user.id)


@router.get("")
def dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    is_worker = current_user.role == "Worker"
    today = date.today().isoformat()

    # ---- Tasks (scoped) ----
    task_q = db.query(Task)
    if is_worker:
        task_q = task_q.filter(Task.assigned_to == current_user.id)
    tasks = task_q.all()

    total_tasks = len(tasks)
    completed = [t for t in tasks if t.status in DONE]
    overdue = [t for t in tasks if _is_overdue(t)]
    due_today = [t for t in tasks if t.end_date == today and t.status not in DONE]
    unassigned = [t for t in tasks if not t.assigned_to]
    pending = [t for t in tasks if t.status not in DONE]
    in_progress = [t for t in tasks if t.status == "In Progress"]

    # ---- Projects (scoped) ----
    if is_worker:
        member_pids = {m.project_id for m in
                       db.query(ProjectMember).filter(ProjectMember.employee_id == current_user.id).all()}
        task_pids = {t.project_id for t in tasks if t.project_id}
        pids = member_pids | task_pids
        projects = db.query(Project).filter(Project.id.in_(pids)).all() if pids else []
    else:
        projects = db.query(Project).all()

    proj_status = {}
    for p in projects:
        proj_status[p.status] = proj_status.get(p.status, 0) + 1

    # A project counts as completed by a done-status OR full progress.
    PROJECT_DONE = {"Completed", "Closed", "Done"}
    def _proj_done(p):
        return (p.status in PROJECT_DONE) or ((p.progress or 0) >= 100)
    proj_completed = sum(1 for p in projects if _proj_done(p))
    proj_in_progress = sum(1 for p in projects if not _proj_done(p) and p.status == "In Progress")
    proj_pending = len(projects) - proj_completed - proj_in_progress

    # ---- Employees (admin/master only) ----
    employees_card = None
    if not is_worker:
        workers = db.query(User).filter(User.role == "Worker").all()
        active = [u for u in workers if (u.status or "Active") == "Active"]
        working_ids = {t.assigned_to for t in db.query(Task).filter(Task.status == "In Progress").all() if t.assigned_to}
        with_pending = set()
        for t in db.query(Task).filter(~Task.status.in_(DONE)).all():
            if t.assigned_to:
                with_pending.add(t.assigned_to)
        employees_card = {
            "total": len(workers),
            "active": len(active),
            "working": len(working_ids),
            "withPendingTasks": len(with_pending),
        }

    # ---- Task status distribution (normalised to 4 buckets for the chart) ----
    TODO_STATUSES = {"To Do", "To Call", "Scheduled", "Planned", "Pending", "New"}
    def _bucket(t):
        if _is_overdue(t):
            return "Overdue"
        s = t.status or "To Do"
        if s in DONE:
            return "Completed"
        if s in TODO_STATUSES:
            return "To Do"
        return "In Progress"
    status_dist = {}
    for t in tasks:
        b = _bucket(t)
        status_dist[b] = status_dist.get(b, 0) + 1

    # ---- Tasks by work category ----
    cat_counts = {}
    for t in tasks:
        cat_counts[t.category or "general"] = cat_counts.get(t.category or "general", 0) + 1
    category_breakdown = [
        {"key": k, "name": CATEGORY_BY_KEY.get(k, {}).get("name", k),
         "color": CATEGORY_BY_KEY.get(k, {}).get("color", "#64748b"), "count": v}
        for k, v in sorted(cat_counts.items(), key=lambda kv: -kv[1])
    ]

    # ---- Today's scheduled + upcoming deadlines + overdue lists ----
    def light(t):
        return {"id": t.id, "name": t.name, "status": t.status, "priority": t.priority,
                "endDate": t.end_date, "assignedToName": t.assignee.name if t.assignee else "",
                "projectName": t.project.name if t.project else ""}

    upcoming = sorted(
        [t for t in tasks if t.end_date and t.status not in DONE and
         (datetime.strptime(t.end_date, "%Y-%m-%d").date() >= date.today()
          if _safe_date(t.end_date) else False)],
        key=lambda t: t.end_date)[:6]

    # ---- Recent activity (notifications) ----
    notif_q = db.query(Notification)
    if is_worker:
        notif_q = notif_q.filter((Notification.user_id == current_user.id) | (Notification.user_id.is_(None)))
    recent = notif_q.order_by(Notification.created_at.desc()).limit(300).all()

    # ---- Timesheet status + working hours ----
    ts_q = db.query(Timesheet)
    if is_worker:
        ts_q = ts_q.filter(Timesheet.user_id == current_user.id)
    timesheets = ts_q.all()
    logged_hours = round(sum((t.total_hours or 0) for t in timesheets), 1)

    # ---- Idle-time summary (admin/master): alerts are sessions idle > 15 min ----
    idle_alerts = 0
    idle_sessions = 0
    idle_minutes = 0
    idle_alerts_by_emp = []
    if not is_worker:
        users_map = {u.id: (u.name or u.email) for u in db.query(User).all()}
        idle_logs = db.query(IdleTimeLog).all()
        idle_sessions = len(idle_logs)
        idle_minutes = round(sum((l.duration_seconds or 0) for l in idle_logs) / 60)
        alert_logs = [l for l in idle_logs if (l.duration_seconds or 0) >= 900]
        idle_alerts = len(alert_logs)

        emp_counts = defaultdict(int)
        for l in alert_logs:
            emp_name = users_map.get(l.user_id, l.user_id or "Unknown")
            emp_counts[emp_name] += 1
        idle_alerts_by_emp = [{"name": k, "alerts": v} for k, v in sorted(emp_counts.items(), key=lambda x: -x[1])]
    else:
        my_logs = db.query(IdleTimeLog).filter(IdleTimeLog.user_id == current_user.id).all()
        idle_sessions = len(my_logs)
        idle_minutes = round(sum((l.duration_seconds or 0) for l in my_logs) / 60)
        alert_logs = [l for l in my_logs if (l.duration_seconds or 0) >= 900]
        idle_alerts = len(alert_logs)
        if idle_alerts > 0:
            idle_alerts_by_emp = [{"name": current_user.name or "Me", "alerts": idle_alerts}]

    return {
        "role": current_user.role,
        "cards": {
            "projects": {
                "total": len(projects),
                "inProgress": proj_in_progress,
                "completed": proj_completed,
                "pending": proj_pending,
            },
            "tasks": {
                "totalPending": len(pending),
                "overdue": len(overdue),
                "dueToday": len(due_today),
                "unassigned": len(unassigned),
                "inProgress": len(in_progress),
                "completed": len(completed),
                "total": total_tasks,
            },
            "employees": employees_card,
        },
        "charts": {
            "taskStatus": status_dist,
            "projectStatus": proj_status,
            "categoryBreakdown": category_breakdown,
            "idleAlerts": idle_alerts_by_emp,
        },
        "todayTasks": [light(t) for t in tasks if t.end_date == today],
        "upcomingDeadlines": [light(t) for t in upcoming],
        "overdueTasks": [light(t) for t in overdue][:6],
        "recentActivity": [n.to_dict() for n in recent],
        "timesheets": {"loggedHours": logged_hours, "count": len(timesheets)},
        "idleAlerts": idle_alerts,
        "idle": {"alerts": idle_alerts, "sessions": idle_sessions, "minutes": idle_minutes, "byEmployee": idle_alerts_by_emp},
    }


def _safe_date(s):
    try:
        datetime.strptime(s, "%Y-%m-%d")
        return True
    except Exception:
        return False
