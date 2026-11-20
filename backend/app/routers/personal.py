# backend/app/routers/personal.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.db.database import get_db
from backend.app.models.models import Task, Subtask, Notification, User
from backend.app.core.deps import get_current_user

router = APIRouter(prefix="/api/personal", tags=["Personal Portal"])


class SubtaskItem(BaseModel):
    title: Optional[str] = None
    isDone: Optional[bool] = False
    sortOrder: Optional[int] = 1


@router.get("/tasks")
def get_my_tasks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.assigned_to == current_user.id).all()
    results = []
    for t in tasks:
        d = t.to_dict()
        d["subtasks"] = [s.to_dict() for s in
                         db.query(Subtask).filter(Subtask.task_id == t.id).order_by(Subtask.sort_order).all()]
        results.append(d)
    return results


@router.post("/tasks/{task_id}/subtasks")
def add_subtask(task_id: str, sub_in: SubtaskItem, current_user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    new_sub = Subtask(task_id=task_id, title=sub_in.title or "Untitled",
                      is_done=sub_in.isDone or False, sort_order=sub_in.sortOrder or 1)
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    return new_sub.to_dict()


@router.put("/subtasks/{subtask_id}")
def toggle_subtask(subtask_id: int, sub_in: SubtaskItem, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    sub = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subtask not found")
    if sub_in.isDone is not None:
        sub.is_done = sub_in.isDone
    if sub_in.title is not None:
        sub.title = sub_in.title
    db.commit()
    db.refresh(sub)
    return sub.to_dict()


@router.delete("/subtasks/{subtask_id}")
def delete_subtask(subtask_id: int, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    sub = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subtask not found")
    db.delete(sub)
    db.commit()
    return {"success": True, "message": "Subtask deleted"}


@router.get("/notifications")
def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifs = (db.query(Notification)
              .filter((Notification.user_id == current_user.id) | (Notification.user_id.is_(None)))
              .order_by(Notification.created_at.desc()).all())
    return [n.to_dict() for n in notifs]
