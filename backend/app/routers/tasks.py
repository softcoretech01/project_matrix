# backend/app/routers/tasks.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import random
from datetime import datetime

from backend.app.db.database import get_db
from backend.app.models.models import Task, Subtask, Comment, Notification

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

class TaskCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    projectId: Optional[str] = ""
    sectionId: Optional[str] = ""
    moduleId: Optional[str] = ""
    priority: Optional[str] = "Medium"
    status: Optional[str] = "Open"
    progress: Optional[int] = 0
    assignedTo: Optional[str] = ""
    reviewerId: Optional[str] = ""
    startDate: Optional[str] = ""
    endDate: Optional[str] = ""
    label: Optional[str] = ""
    parentTaskId: Optional[str] = ""

class TaskUpdate(BaseModel):
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
    label: Optional[str] = None
    parentTaskId: Optional[str] = None

class SubtaskCreate(BaseModel):
    title: str
    isDone: Optional[bool] = False
    sortOrder: Optional[int] = 0

class CommentCreate(BaseModel):
    userId: str
    userName: str
    text: str

@router.get("")
def get_tasks(
    status: Optional[str] = None,
    projectId: Optional[str] = None,
    assignedTo: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Task)
    if status and status != "All":
        query = query.filter(Task.status == status)
    if projectId:
        query = query.filter(Task.project_id == projectId)
    if assignedTo:
        query = query.filter(Task.assigned_to == assignedTo)

    tasks = query.order_by(Task.created_at.desc()).all()
    results = []
    for t in tasks:
        d = t.to_dict()
        subs = db.query(Subtask).filter(Subtask.task_id == t.id).all()
        d["subtasks"] = [s.to_dict() for s in subs]
        results.append(d)
    return results

@router.post("")
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    count = db.query(Task).count() + 101
    new_id = f"TSK-{count}"
    while db.query(Task).filter(Task.id == new_id).first():
        new_id = f"TSK-{random.randint(200, 9999)}"

    sec_id = data.sectionId or data.moduleId or ""

    task = Task(
        id=new_id,
        name=data.name,
        description=data.description or "",
        project_id=data.projectId or "",
        section_id=sec_id,
        module_id=sec_id,
        priority=data.priority or "Medium",
        status=data.status or "Open",
        progress=data.progress or 0,
        assigned_to=data.assignedTo or "",
        reviewer_id=data.reviewerId or "",
        start_date=data.startDate or "",
        end_date=data.endDate or "",
        label=data.label or "",
        parent_task_id=data.parentTaskId or ""
    )
    db.add(task)

    if data.assignedTo:
        notif = Notification(
            user_id=data.assignedTo,
            title="New Task Assigned",
            message=f"You have been assigned to '{task.name}'."
        )
        db.add(notif)

    db.commit()
    db.refresh(task)

    d = task.to_dict()
    d["subtasks"] = []
    d["comments"] = []
    return d

@router.get("/{task_id}")
def get_task_detail(task_id: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    subtasks = db.query(Subtask).filter(Subtask.task_id == task_id).all()
    comments = db.query(Comment).filter(Comment.task_id == task_id).order_by(Comment.created_at.asc()).all()

    result = task.to_dict()
    result["subtasks"] = [s.to_dict() for s in subtasks]
    result["comments"] = [c.to_dict() for c in comments]
    return result

@router.put("/{task_id}")
def update_task(task_id: str, data: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_status = task.status
    if data.name is not None:
        task.name = data.name
    if data.description is not None:
        task.description = data.description
    if data.projectId is not None:
        task.project_id = data.projectId
    if data.sectionId is not None:
        task.section_id = data.sectionId
        task.module_id = data.sectionId
    elif data.moduleId is not None:
        task.module_id = data.moduleId
        task.section_id = data.moduleId
    if data.priority is not None:
        task.priority = data.priority
    if data.status is not None:
        task.status = data.status
        if task.status in ["Completed", "Closed"]:
            task.completed_at = datetime.utcnow()
            task.progress = 100
        else:
            task.completed_at = None
    if data.progress is not None:
        task.progress = data.progress
    if data.assignedTo is not None:
        task.assigned_to = data.assignedTo
    if data.reviewerId is not None:
        task.reviewer_id = data.reviewerId
    if data.startDate is not None:
        task.start_date = data.startDate
    if data.endDate is not None:
        task.end_date = data.endDate
    if data.label is not None:
        task.label = data.label
    if data.parentTaskId is not None:
        task.parent_task_id = data.parentTaskId

    if data.status and data.status != old_status and task.assigned_to:
        db.add(Notification(
            user_id=task.assigned_to,
            title="Task Status Updated",
            message=f"'{task.name}' status changed to {task.status}."
        ))

    db.commit()
    db.refresh(task)
    return task.to_dict()

@router.delete("/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.query(Subtask).filter(Subtask.task_id == task_id).delete()
    db.query(Comment).filter(Comment.task_id == task_id).delete()
    db.delete(task)
    db.commit()
    return {"success": True, "message": "Task deleted successfully"}

# Subtasks
@router.get("/{task_id}/subtasks")
def get_subtasks(task_id: str, db: Session = Depends(get_db)):
    subtasks = db.query(Subtask).filter(Subtask.task_id == task_id).all()
    return [s.to_dict() for s in subtasks]

@router.post("/{task_id}/subtasks")
def add_subtask(task_id: str, data: SubtaskCreate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    subtask = Subtask(
        task_id=task_id,
        title=data.title,
        is_done=data.isDone if data.isDone is not None else False,
        sort_order=data.sortOrder or 0
    )
    db.add(subtask)
    db.commit()
    db.refresh(subtask)

    all_subs = db.query(Subtask).filter(Subtask.task_id == task_id).all()
    if all_subs:
        done_count = sum(1 for s in all_subs if s.is_done)
        task.progress = int((done_count / len(all_subs)) * 100)
        db.commit()

    return subtask.to_dict()

@router.put("/subtasks/{subtask_id}/toggle")
def toggle_subtask(subtask_id: int, db: Session = Depends(get_db)):
    subtask = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")

    subtask.is_done = not subtask.is_done
    db.commit()

    task = db.query(Task).filter(Task.id == subtask.task_id).first()
    if task:
        all_subs = db.query(Subtask).filter(Subtask.task_id == task.id).all()
        if all_subs:
            done_count = sum(1 for s in all_subs if s.is_done)
            task.progress = int((done_count / len(all_subs)) * 100)
            if task.progress == 100:
                task.status = "Completed"
            elif task.status == "Completed" and task.progress < 100:
                task.status = "In Progress"
            db.commit()

    return subtask.to_dict()

@router.delete("/subtasks/{subtask_id}")
def delete_subtask(subtask_id: int, db: Session = Depends(get_db)):
    subtask = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    task_id = subtask.task_id
    db.delete(subtask)
    db.commit()

    task = db.query(Task).filter(Task.id == task_id).first()
    if task:
        all_subs = db.query(Subtask).filter(Subtask.task_id == task_id).all()
        if all_subs:
            done_count = sum(1 for s in all_subs if s.is_done)
            task.progress = int((done_count / len(all_subs)) * 100)
            db.commit()

    return {"message": "Subtask deleted successfully"}

# Comments
@router.get("/{task_id}/comments")
def get_comments(task_id: str, db: Session = Depends(get_db)):
    comments = db.query(Comment).filter(Comment.task_id == task_id).order_by(Comment.created_at.asc()).all()
    return [c.to_dict() for c in comments]

@router.post("/{task_id}/comments")
def add_comment(task_id: str, data: CommentCreate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    comment = Comment(
        task_id=task_id,
        user_id=data.userId,
        user_name=data.userName,
        text=data.text
    )
    db.add(comment)

    if task.assigned_to and task.assigned_to != data.userId:
        db.add(Notification(
            user_id=task.assigned_to,
            title="New Comment on Task",
            message=f"{data.userName} commented on '{task.name}'."
        ))

    db.commit()
    db.refresh(comment)
    return comment.to_dict()
