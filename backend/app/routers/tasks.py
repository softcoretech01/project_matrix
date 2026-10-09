# backend/app/routers/tasks.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.db.session import get_db
from app.models.task import Task, Subtask
from app.schemas.task import TaskCreate, TaskUpdate, TaskOut, SubtaskItem
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/tasks", tags=["Tasks"])

def format_task_out(t: Task, db: Session) -> TaskOut:
    subs = db.query(Subtask).filter(Subtask.task_id == t.id).all()
    sub_items = [
        SubtaskItem(
            id=s.id,
            title=s.title,
            isDone=s.is_done,
            sortOrder=s.sort_order
        )
        for s in subs
    ]
    return TaskOut(
        id=t.id,
        name=t.name,
        description=t.description,
        projectId=t.project_id,
        moduleId=t.module_id,
        priority=t.priority,
        status=t.status,
        progress=t.progress,
        assignedTo=t.assigned_to,
        reviewerId=t.reviewer_id,
        parentTaskId=t.parent_task_id,
        startDate=t.start_date,
        endDate=t.end_date,
        completedAt=t.completed_at.isoformat() if t.completed_at else None,
        createdAt=t.created_at.isoformat() if t.created_at else None,
        subtasks=sub_items
    )

@router.get("", response_model=List[TaskOut])
def get_tasks(
    assignedTo: Optional[str] = None,
    projectId: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    query = db.query(Task)
    if assignedTo:
        query = query.filter(Task.assigned_to == assignedTo)
    if projectId:
        query = query.filter(Task.project_id == projectId)
    if status and status != "All" and status != "Active":
        query = query.filter(Task.status == status)

    tasks = query.all()
    return [format_task_out(t, db) for t in tasks]

@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: str, db: Session = Depends(get_db)):
    t = db.query(Task).filter(Task.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    return format_task_out(t, db)

@router.post("", response_model=TaskOut)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user)):
    count = db.query(Task).count()
    new_id = f"TSK-{100 + count + 1}"

    task = Task(
        id=new_id,
        name=task_in.name,
        description=task_in.description,
        project_id=task_in.projectId,
        module_id=task_in.moduleId,
        priority=task_in.priority or "Medium",
        status=task_in.status or "Open",
        progress=task_in.progress or 0,
        assigned_to=task_in.assignedTo,
        reviewer_id=task_in.reviewerId,
        parent_task_id=task_in.parentTaskId,
        start_date=task_in.startDate,
        end_date=task_in.endDate,
        created_by=current_user.id if current_user else None
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return format_task_out(task, db)

@router.put("/{task_id}", response_model=TaskOut)
def update_task(task_id: str, task_in: TaskUpdate, db: Session = Depends(get_db)):
    t = db.query(Task).filter(Task.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    if task_in.name is not None:
        t.name = task_in.name
    if task_in.description is not None:
        t.description = task_in.description
    if task_in.projectId is not None:
        t.project_id = task_in.projectId
    if task_in.moduleId is not None:
        t.module_id = task_in.moduleId
    if task_in.priority is not None:
        t.priority = task_in.priority
    if task_in.status is not None:
        t.status = task_in.status
        if task_in.status == "Completed" or task_in.status == "Closed":
            t.completed_at = datetime.utcnow()
            t.progress = 100
        else:
            t.completed_at = None
    if task_in.progress is not None:
        t.progress = task_in.progress
    if task_in.assignedTo is not None:
        t.assigned_to = task_in.assignedTo
    if task_in.reviewerId is not None:
        t.reviewer_id = task_in.reviewerId
    if task_in.startDate is not None:
        t.start_date = task_in.startDate
    if task_in.endDate is not None:
        t.end_date = task_in.endDate

    db.commit()
    db.refresh(t)
    return format_task_out(t, db)

@router.delete("/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    t = db.query(Task).filter(Task.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(t)
    db.commit()
    return {"success": True, "message": "Task deleted"}

