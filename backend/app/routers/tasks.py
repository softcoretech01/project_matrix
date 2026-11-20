# backend/app/routers/tasks.py
import json
import random
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.db.database import get_db
from backend.app.models.models import (
    Task, Subtask, Comment, Notification, TaskUpdate as TaskUpdateLog, TaskAttachment, User, Project,
)
from backend.app.core.deps import get_current_user
from backend.app.core.storage import save_upload, delete_file, IMAGE_EXTS, DOC_EXTS
from backend.app.core.work_categories import DONE_STATUSES

router = APIRouter(prefix="/api/tasks", tags=["tasks"])
DONE = DONE_STATUSES


class TaskCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    projectId: Optional[str] = ""
    sectionId: Optional[str] = ""
    moduleId: Optional[str] = ""
    priority: Optional[str] = "Medium"
    status: Optional[str] = "To Do"
    progress: Optional[int] = 0
    assignedTo: Optional[str] = ""
    reviewerId: Optional[str] = ""
    startDate: Optional[str] = ""
    endDate: Optional[str] = ""
    estimatedHours: Optional[float] = None
    label: Optional[str] = ""
    category: Optional[str] = "general"
    customData: Optional[dict] = None


class TaskPatch(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    projectId: Optional[str] = None
    sectionId: Optional[str] = None
    moduleId: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    assignedTo: Optional[str] = None
    reviewerId: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    estimatedHours: Optional[float] = None
    label: Optional[str] = None
    category: Optional[str] = None
    customData: Optional[dict] = None
    remark: Optional[str] = None     # optional note attached to the update


class SubtaskCreate(BaseModel):
    title: str
    isDone: Optional[bool] = False
    sortOrder: Optional[int] = 0


class CommentCreate(BaseModel):
    text: str


def _log(db, task, user, utype, old, new, remark=None):
    db.add(TaskUpdateLog(task_id=task.id, user_id=user.id, user_name=user.name,
                         update_type=utype, old_value=str(old) if old is not None else None,
                         new_value=str(new) if new is not None else None, remark=remark))


@router.get("")
def get_tasks(status: Optional[str] = None, projectId: Optional[str] = None,
              assignedTo: Optional[str] = None, search: Optional[str] = None,
              priority: Optional[str] = None, category: Optional[str] = None,
              current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Task)
    if current_user.role == "Worker":
        q = q.filter(Task.assigned_to == current_user.id)
    elif assignedTo:
        q = q.filter(Task.assigned_to == assignedTo)
    if status and status not in ("All", ""):
        q = q.filter(Task.status == status)
    if category and category not in ("All", ""):
        q = q.filter(Task.category == category)
    if projectId:
        q = q.filter(Task.project_id == projectId)
    if priority and priority not in ("All", ""):
        q = q.filter(Task.priority == priority)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter((Task.name.ilike(term)) | (Task.id.ilike(term)) | (Task.description.ilike(term)))
    tasks = q.order_by(Task.created_at.desc()).all()
    out = []
    for t in tasks:
        d = t.to_dict()
        d["subtasks"] = [s.to_dict() for s in
                         db.query(Subtask).filter(Subtask.task_id == t.id).order_by(Subtask.sort_order).all()]
        out.append(d)
    return out


@router.post("")
def create_task(data: TaskCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "Worker":
        raise HTTPException(status_code=403, detail="Workers cannot create tasks")

    if data.projectId:
        proj = db.query(Project).filter(Project.id == data.projectId).first()
        if proj:
            if proj.start_date and data.startDate and data.startDate < proj.start_date:
                raise HTTPException(status_code=400, detail=f"Task start date cannot be earlier than project start date ({proj.start_date})")
            if proj.end_date and data.startDate and data.startDate > proj.end_date:
                raise HTTPException(status_code=400, detail=f"Task start date cannot be later than project end date ({proj.end_date})")
            if proj.start_date and data.endDate and data.endDate < proj.start_date:
                raise HTTPException(status_code=400, detail=f"Task due date cannot be earlier than project start date ({proj.start_date})")
            if proj.end_date and data.endDate and data.endDate > proj.end_date:
                raise HTTPException(status_code=400, detail=f"Task due date cannot be later than project end date ({proj.end_date})")
    if data.startDate and data.endDate and data.startDate > data.endDate:
        raise HTTPException(status_code=400, detail="Task start date cannot be after due date")

    n = db.query(Task).count() + 1001
    new_id = f"TSK-{n}"
    while db.query(Task).filter(Task.id == new_id).first():
        new_id = f"TSK-{random.randint(2000, 99999)}"

    task = Task(
        id=new_id, code=new_id, name=data.name, description=data.description or "",
        project_id=data.projectId or None, section_id=data.sectionId or None,
        module_id=data.moduleId or None, priority=data.priority or "Medium",
        status=data.status or "To Do", progress=data.progress or 0,
        assigned_to=data.assignedTo or None, reviewer_id=data.reviewerId or None,
        start_date=data.startDate or "", end_date=data.endDate or "",
        estimated_hours=data.estimatedHours, label=data.label or "", created_by=current_user.id,
        category=data.category or "general", custom_data=json.dumps(data.customData or {}),
    )
    db.add(task)
    db.flush()
    _log(db, task, current_user, "created", None, task.status)
    if data.assignedTo:
        db.add(Notification(user_id=data.assignedTo, type="task", title="New Task Assigned",
                            message=f"You have been assigned to '{task.name}'.", task_id=task.id))
    db.commit()
    db.refresh(task)
    d = task.to_dict()
    d["subtasks"] = []
    d["comments"] = []
    return d


@router.get("/{task_id}")
def get_task_detail(task_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    d = task.to_dict()
    d["subtasks"] = [s.to_dict() for s in
                     db.query(Subtask).filter(Subtask.task_id == task_id).order_by(Subtask.sort_order).all()]
    d["comments"] = [c.to_dict() for c in
                     db.query(Comment).filter(Comment.task_id == task_id).order_by(Comment.created_at).all()]
    d["updates"] = [u.to_dict() for u in
                    db.query(TaskUpdateLog).filter(TaskUpdateLog.task_id == task_id)
                    .order_by(TaskUpdateLog.created_at.desc()).all()]
    d["attachments"] = [a.to_dict() for a in
                        db.query(TaskAttachment).filter(TaskAttachment.task_id == task_id).all()]
    # timesheets for this task
    from backend.app.models.models import Timesheet
    d["timesheets"] = [t.to_dict() for t in
                       db.query(Timesheet).filter(Timesheet.task_id == task_id)
                       .order_by(Timesheet.created_at.desc()).all()]
    return d


@router.put("/{task_id}")
def update_task(task_id: str, data: TaskPatch, current_user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Workers can only update their own tasks (status/progress)
    if current_user.role == "Worker" and task.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own tasks")

    target_project_id = data.projectId if data.projectId is not None else task.project_id
    target_start = data.startDate if data.startDate is not None else task.start_date
    target_end = data.endDate if data.endDate is not None else task.end_date

    if target_project_id:
        proj = db.query(Project).filter(Project.id == target_project_id).first()
        if proj:
            if proj.start_date and target_start and target_start < proj.start_date:
                raise HTTPException(status_code=400, detail=f"Task start date cannot be earlier than project start date ({proj.start_date})")
            if proj.end_date and target_start and target_start > proj.end_date:
                raise HTTPException(status_code=400, detail=f"Task start date cannot be later than project end date ({proj.end_date})")
            if proj.start_date and target_end and target_end < proj.start_date:
                raise HTTPException(status_code=400, detail=f"Task due date cannot be earlier than project start date ({proj.start_date})")
            if proj.end_date and target_end and target_end > proj.end_date:
                raise HTTPException(status_code=400, detail=f"Task due date cannot be later than project end date ({proj.end_date})")
    if target_start and target_end and target_start > target_end:
        raise HTTPException(status_code=400, detail="Task start date cannot be after due date")

    old_status, old_progress, old_assignee = task.status, task.progress, task.assigned_to

    simple = {"name": "name", "description": "description", "projectId": "project_id",
              "sectionId": "section_id", "moduleId": "module_id", "priority": "priority",
              "startDate": "start_date", "endDate": "end_date", "estimatedHours": "estimated_hours",
              "label": "label", "reviewerId": "reviewer_id", "category": "category"}
    # These map to nullable foreign keys — an empty string is not a valid key, so store NULL.
    fk_fields = {"projectId", "sectionId", "moduleId", "reviewerId"}
    for field, col in simple.items():
        val = getattr(data, field)
        if val is not None:
            if field in fk_fields and val == "":
                val = None
            setattr(task, col, val)
    if data.customData is not None:
        task.custom_data = json.dumps(data.customData)

    status_changed = False
    if data.status is not None and data.status != old_status:
        status_changed = True
        task.status = data.status
        if data.status in DONE:
            task.completed_at = datetime.utcnow()
            task.progress = 100
        else:
            task.completed_at = None
        _log(db, task, current_user, "status", old_status, data.status, data.remark)
        if task.assigned_to:
            db.add(Notification(user_id=task.assigned_to, type="task", title="Task Status Updated",
                                message=f"'{task.name}' is now {task.status}.", task_id=task.id))
    if data.progress is not None and data.progress != old_progress:
        task.progress = data.progress
        _log(db, task, current_user, "progress", old_progress, data.progress, data.remark)
    if data.assignedTo is not None and data.assignedTo != old_assignee:
        task.assigned_to = data.assignedTo or None
        _log(db, task, current_user, "assignment", old_assignee, data.assignedTo)
        if data.assignedTo:
            db.add(Notification(user_id=data.assignedTo, type="task", title="Task Assigned",
                                message=f"You have been assigned to '{task.name}'.", task_id=task.id))
    if data.remark and not status_changed:
        _log(db, task, current_user, "remark", None, None, data.remark)

    db.commit()
    db.refresh(task)
    return task.to_dict()


@router.delete("/{task_id}")
def delete_task(task_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "Worker":
        raise HTTPException(status_code=403, detail="Workers cannot delete tasks")
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for a in db.query(TaskAttachment).filter(TaskAttachment.task_id == task_id).all():
        delete_file("tasks", a.filename)
    db.delete(task)   # cascades subtasks/comments/updates/attachments
    db.commit()
    return {"success": True, "message": "Task deleted successfully"}


# ---------- attachments ----------
@router.post("/{task_id}/attachments")
def upload_attachment(task_id: str, file: UploadFile = File(...),
                      current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    saved = save_upload(file, "tasks", allowed=DOC_EXTS, max_bytes=10 * 1024 * 1024)
    att = TaskAttachment(task_id=task_id, filename=saved["filename"], filepath=saved["filepath"],
                         uploaded_by=current_user.id)
    db.add(att)
    db.commit()
    db.refresh(att)
    return att.to_dict()


@router.delete("/attachments/{attachment_id}")
def delete_attachment(attachment_id: int, current_user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    att = db.query(TaskAttachment).filter(TaskAttachment.id == attachment_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
    delete_file("tasks", att.filename)
    db.delete(att)
    db.commit()
    return {"success": True}


# ---------- subtasks ----------
@router.post("/{task_id}/subtasks")
def add_subtask(task_id: str, data: SubtaskCreate, current_user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    sub = Subtask(task_id=task_id, title=data.title, is_done=bool(data.isDone), sort_order=data.sortOrder or 0)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub.to_dict()


@router.put("/subtasks/{subtask_id}/toggle")
def toggle_subtask(subtask_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subtask not found")
    sub.is_done = not sub.is_done
    db.commit()
    task = db.query(Task).filter(Task.id == sub.task_id).first()
    if task:
        subs = db.query(Subtask).filter(Subtask.task_id == task.id).all()
        if subs:
            task.progress = int(sum(1 for s in subs if s.is_done) / len(subs) * 100)
            db.commit()
    return sub.to_dict()


@router.delete("/subtasks/{subtask_id}")
def delete_subtask(subtask_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subtask not found")
    db.delete(sub)
    db.commit()
    return {"message": "Subtask deleted successfully"}


# ---------- comments ----------
@router.post("/{task_id}/comments")
def add_comment(task_id: str, data: CommentCreate, current_user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    comment = Comment(task_id=task_id, user_id=current_user.id, user_name=current_user.name, text=data.text)
    db.add(comment)
    if task.assigned_to and task.assigned_to != current_user.id:
        db.add(Notification(user_id=task.assigned_to, type="task", title="New Comment",
                            message=f"{current_user.name} commented on '{task.name}'.", task_id=task.id))
    db.commit()
    db.refresh(comment)
    return comment.to_dict()
