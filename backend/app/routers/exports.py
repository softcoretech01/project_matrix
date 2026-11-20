# backend/app/routers/exports.py
"""Excel (.xlsx) exports for all listing/report pages. Respects role scope + filters."""
import io
from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

from backend.app.db.database import get_db
from backend.app.models.models import (
    Project, Task, User, Timesheet, IdleTimeLog, CameraActivityLog, ProjectMember,
)
from backend.app.core.deps import get_current_user, require_roles
from backend.app.core.work_categories import DONE_STATUSES, CATEGORY_BY_KEY

router = APIRouter(prefix="/api/exports", tags=["exports"])
DONE = DONE_STATUSES


def _xlsx(title: str, headers: list, rows: list) -> Response:
    wb = Workbook()
    ws = wb.active
    ws.title = title[:31]
    header_fill = PatternFill("solid", fgColor="4F46E5")
    header_font = Font(bold=True, color="FFFFFF")
    ws.append(headers)
    for c in ws[1]:
        c.fill = header_fill
        c.font = header_font
        c.alignment = Alignment(horizontal="center")
    for r in rows:
        ws.append(r)
    for i, h in enumerate(headers, 1):
        width = max(len(str(h)), *(len(str(r[i - 1])) for r in rows)) if rows else len(str(h))
        ws.column_dimensions[chr(64 + i) if i <= 26 else "A"].width = min(width + 4, 45)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    fname = f"{title.replace(' ', '_')}_{date.today().isoformat()}.xlsx"
    return Response(
        content=buf.read(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.get("/projects")
def export_projects(current_user: User = Depends(require_roles(["Admin", "Master"])), db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    rows = []
    for p in projects:
        tasks = db.query(Task).filter(Task.project_id == p.id).all()
        rows.append([p.id, p.name, p.ownerName if hasattr(p, "ownerName") else (p.owner.name if p.owner else ""),
                     p.priority, p.status, f"{p.progress or 0}%", len(tasks),
                     sum(1 for t in tasks if t.status in DONE), p.start_date, p.end_date])
    return _xlsx("Projects Report",
                 ["Project ID", "Name", "Owner", "Priority", "Status", "Progress", "Tasks", "Completed", "Start", "End"], rows)


@router.get("/tasks")
def export_tasks(projectId: Optional[str] = None, status: Optional[str] = None,
                 current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Task)
    if current_user.role == "Worker":
        q = q.filter(Task.assigned_to == current_user.id)
    if projectId:
        q = q.filter(Task.project_id == projectId)
    if status and status not in ("All", ""):
        q = q.filter(Task.status == status)
    rows = [[t.id, CATEGORY_BY_KEY.get(t.category or "general", {}).get("name", t.category or "General"),
             t.name, t.project.name if t.project else "", t.assignee.name if t.assignee else "",
             t.priority, t.status, f"{t.progress or 0}%", t.start_date, t.end_date, t.estimated_hours or ""]
            for t in q.all()]
    return _xlsx("Task Report",
                 ["Task ID", "Category", "Name", "Project", "Assignee", "Priority", "Status", "Progress", "Start", "Due", "Est. Hours"], rows)


@router.get("/employees")
def export_employees(current_user: User = Depends(require_roles(["Admin", "Master"])), db: Session = Depends(get_db)):
    rows = [[u.code, u.name, u.email, u.role, u.designation, u.department, u.status]
            for u in db.query(User).all()]
    return _xlsx("Employee Report", ["Code", "Name", "Email", "Role", "Designation", "Department", "Status"], rows)


@router.get("/timesheets")
def export_timesheets(userId: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Timesheet)
    if current_user.role == "Worker":
        q = q.filter(Timesheet.user_id == current_user.id)
    elif userId:
        q = q.filter(Timesheet.user_id == userId)
    rows = [[t.work_date, t.user.name if t.user else "", t.project.name if t.project else "",
             t.task.name if t.task else "", t.from_time, t.to_time, t.total_hours, t.status,
             (t.remarks or "")[:120]] for t in q.all()]
    return _xlsx("Timesheet Report",
                 ["Date", "Employee", "Project", "Task", "From", "To", "Hours", "Status", "Remarks"], rows)


@router.get("/performance")
def export_performance(current_user: User = Depends(require_roles(["Admin", "Master"])), db: Session = Depends(get_db)):
    from backend.app.routers.performance import _metrics_for
    rows = []
    for u in db.query(User).filter(User.role == "Worker").all():
        m = _metrics_for(db, u, None, None, None, None)
        rows.append([m["employeeName"], m["tasks"]["totalAssigned"], m["tasks"]["completed"],
                     m["tasks"]["pending"], m["tasks"]["overdue"], f"{m['tasks']['completionRate']}%",
                     m["timesheets"]["loggedHours"], m["timesheets"]["avgHoursPerDay"],
                     f"{m['timesheets']['submissionRate']}%", m["productivity"]["score"]])
    return _xlsx("Performance Matrix Report",
                 ["Employee", "Assigned", "Completed", "Pending", "Overdue", "Completion %",
                  "Logged Hrs", "Avg Hrs/Day", "Submission %", "Score"], rows)


@router.get("/idle-time")
def export_idle(current_user: User = Depends(require_roles(["Admin", "Master"])), db: Session = Depends(get_db)):
    rows = [[l.user.name if l.user else "", l.log_date,
             l.idle_start.isoformat() if l.idle_start else "", l.idle_end.isoformat() if l.idle_end else "",
             round((l.duration_seconds or 0) / 60, 1), l.reason] for l in db.query(IdleTimeLog).all()]
    return _xlsx("Idle-Time Report", ["Employee", "Date", "Idle Start", "Idle End", "Duration (min)", "Reason"], rows)


@router.get("/camera")
def export_camera(current_user: User = Depends(require_roles(["Admin", "Master"])), db: Session = Depends(get_db)):
    rows = [[l.user.name if l.user else "", l.captured_at.isoformat() if l.captured_at else "",
             l.project_id, l.task_id, l.activity_type, l.filename] for l in db.query(CameraActivityLog).all()]
    return _xlsx("Camera Activity Report", ["Employee", "Captured At", "Project", "Task", "Activity", "Image"], rows)
