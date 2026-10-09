# backend/app/routers/personal.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.task import Task, Subtask, Notification
from app.models.user import User
from app.schemas.task import TaskOut, SubtaskItem
from app.core.deps import get_current_user
from app.routers.tasks import format_task_out

router = APIRouter(prefix="/personal", tags=["Personal Portal"])

@router.get("/tasks", response_model=List[TaskOut])
def get_my_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id if current_user else "1"
    tasks = db.query(Task).filter(Task.assigned_to == user_id).all()
    return [format_task_out(t, db) for t in tasks]

@router.post("/tasks/{task_id}/subtasks")
def add_subtask(task_id: str, sub_in: SubtaskItem, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    count = db.query(Subtask).count()
    new_sub = Subtask(
        id=f"SUB-{count + 1}",
        task_id=task_id,
        title=sub_in.title,
        is_done=sub_in.isDone or False,
        sort_order=sub_in.sortOrder or 1
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    return new_sub

@router.put("/subtasks/{subtask_id}")
def toggle_subtask(subtask_id: str, sub_in: SubtaskItem, db: Session = Depends(get_db)):
    sub = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    if sub_in.isDone is not None:
        sub.is_done = sub_in.isDone
    if sub_in.title is not None:
        sub.title = sub_in.title
        
    db.commit()
    db.refresh(sub)
    return sub

@router.delete("/subtasks/{subtask_id}")
def delete_subtask(subtask_id: str, db: Session = Depends(get_db)):
    sub = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subtask not found")
    db.delete(sub)
    db.commit()
    return {"success": True, "message": "Subtask deleted"}

@router.get("/notifications")
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id if current_user else "1"
    notifs = db.query(Notification).filter(Notification.user_id == user_id).order_by(Notification.created_at.desc()).all()
    return notifs

