from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import random
from datetime import datetime

from backend.app.db.database import get_db
from backend.app.models.models import Task, Subtask, Comment, Notification, Project, User

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

class TaskCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    projectId: Optional[str] = ""
    sectionId: Optional[str] = ""
    priority: Optional[str] = "Medium"
    status: Optional[str] = "Open"
    progress: Optional[int] = 0
    assignedTo: Optional[str] = ""
    reviewerId: Optional[str] = ""
    startDate: Optional[str] = ""
    endDate: Optional[str] = ""
    label: Optional[str] = ""

class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    projectId: Optional[str] = None
    sectionId: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    assignedTo: Optional[str] = None
    reviewerId: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    label: Optional[str] = None

class SubtaskCreate(BaseModel):
    title: str

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
    if status:
        query = query.filter(Task.status == status)
    if projectId:
        query = query.filter(Task.project_id == projectId)
    if assignedTo:
        query = query.filter(Task.assigned_to == assignedTo)
    
    tasks = query.order_by(Task.created_at.desc()).all()
    return [t.to_dict() for t in tasks]

@router.post("")
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    # Auto-generate ID: TSK-xxx
    count = db.query(Task).count() + 101
    new_id = f"TSK-{count}"
    while db.query(Task).filter(Task.id == new_id).first():
        new_id = f"TSK-{random.randint(200, 9999)}"

    task = Task(
        id=new_id,
        name=data.name,
        description=data.description,
        project_id=data.projectId,
        section_id=data.sectionId,
        priority=data.priority,
        status=data.status or "Open",
        progress=data.progress or 0,
        assigned_to=data.assignedTo,
        reviewer_id=data.reviewerId,
        start_date=data.startDate,
        end_date=data.endDate,
        label=data.label
    )
    db.add(task)

    # If assigned to a user, create notification
    if data.assignedTo:
        notif = Notification(
            user_id=data.assignedTo,
            title="New Task Assigned",
            message=f"You have been assigned to '{task.name}'."
        )
        db.add(notif)

    db.commit()
    db.refresh(task)
    return task.to_dict()

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
    if data.name is not None: task.name = data.name
    if data.description is not None: task.description = data.description
    if data.projectId is not None: task.project_id = data.projectId
    if data.sectionId is not None: task.section_id = data.sectionId
    if data.priority is not None: task.priority = data.priority
    if data.status is not None: task.status = data.status
    if data.progress is not None: task.progress = data.progress
    if data.assignedTo is not None: task.assigned_to = data.assignedTo
    if data.reviewerId is not None: task.reviewer_id = data.reviewerId
    if data.startDate is not None: task.start_date = data.startDate
    if data.endDate is not None: task.end_date = data.endDate
    if data.label is not None: task.label = data.label

    # Auto sync progress if status changed to Completed
    if data.status == "Completed" and task.progress < 100:
        task.progress = 100
    elif data.status == "Open" and task.progress == 100:
        task.progress = 0

    # Notification if status changed
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
    
    # Delete related subtasks and comments
    db.query(Subtask).filter(Subtask.task_id == task_id).delete()
    db.query(Comment).filter(Comment.task_id == task_id).delete()
    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}

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
    
    subtask = Subtask(task_id=task_id, title=data.title, is_done=False)
    db.add(subtask)
    db.commit()
    db.refresh(subtask)

    # Recalculate task progress
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

    # Recalculate parent task progress
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

    # Recalculate parent task progress
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

    # Notify assignee if someone else commented
    if task.assigned_to and task.assigned_to != data.userId:
        db.add(Notification(
            user_id=task.assigned_to,
            title="New Comment on Task",
            message=f"{data.userName} commented on '{task.name}'."
        ))

    db.commit()
    db.refresh(comment)
    return comment.to_dict()

