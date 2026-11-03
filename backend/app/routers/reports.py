# backend/app/routers/reports.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.models import Task, Project, User

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/effort")
def get_project_effort_report(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    result = []
    for p in projects:
        tasks = db.query(Task).filter(Task.project_id == p.id).all()
        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t.status in ["Completed", "Closed"]])
        rate = int((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0
        result.append({
            "projectName": p.name,
            "plannedHours": total_tasks * 20,
            "actualHours": completed_tasks * 18,
            "completionRate": rate
        })
    return result

@router.get("/utilization")
def get_utilization_report(db: Session = Depends(get_db)):
    users = db.query(User).all()
    result = []
    for u in users:
        tasks = db.query(Task).filter(Task.assigned_to == u.id).all()
        total = len(tasks)
        completed = len([t for t in tasks if t.status in ["Completed", "Closed"]])
        in_progress = len([t for t in tasks if t.status == "In Progress"])
        open_tasks = total - completed - in_progress
        rate = 85 if total > 0 else 0
        result.append({
            "employeeName": u.name,
            "role": u.role,
            "totalTasks": total,
            "openTasks": max(0, open_tasks),
            "inProgressTasks": in_progress,
            "completedTasks": completed,
            "utilizationRate": rate
        })
    return result

@router.get("/productivity")
def get_productivity_report(db: Session = Depends(get_db)):
    return [
        {"period": "Sprint 1", "completedTasks": 12, "storyPoints": 36},
        {"period": "Sprint 2", "completedTasks": 18, "storyPoints": 54},
        {"period": "Sprint 3", "completedTasks": 25, "storyPoints": 75},
        {"period": "Sprint 4", "completedTasks": 21, "storyPoints": 63}
    ]
