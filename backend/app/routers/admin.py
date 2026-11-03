# backend/app/routers/admin.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from backend.app.db.database import get_db
from backend.app.models.models import User, Project, Task
from backend.app.db.init_db import init_db

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

@router.get("/users")
def list_admin_users(db: Session = Depends(get_db)):
    return [u.to_dict() for u in db.query(User).all()]

@router.put("/users/{user_id}/role")
def update_user_role(user_id: str, payload: Dict[str, str], db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_role = payload.get("role")
    if not new_role:
        raise HTTPException(status_code=400, detail="Role is required")
    user.role = new_role
    db.commit()
    return {"success": True, "message": f"Role updated to {new_role}", "user": user.to_dict()}

@router.get("/roles")
def get_roles_summary(db: Session = Depends(get_db)):
    users = db.query(User).all()
    distribution = {}
    for u in users:
        distribution[u.role] = distribution.get(u.role, 0) + 1

    return {
        "roles": [
            {"id": "Admin", "name": "Administrator", "description": "Full access to all system settings, users, and masters", "usersCount": distribution.get("Admin", 0)},
            {"id": "PM", "name": "Project Manager", "description": "Can manage projects, sections, assign tasks, and review work", "usersCount": distribution.get("PM", 0)},
            {"id": "Team Lead", "name": "Team Lead", "description": "Can create tasks, lead team assignments, and review submissions", "usersCount": distribution.get("Team Lead", 0)},
            {"id": "Employee", "name": "Employee / Member", "description": "Can view assigned tasks, update progress, and collaborate", "usersCount": distribution.get("Employee", 0)},
            {"id": "Management", "name": "Management", "description": "Executive read-only access across all project reports and metrics", "usersCount": distribution.get("Management", 0)}
        ]
    }

@router.get("/diagnostics")
def get_system_diagnostics(db: Session = Depends(get_db)):
    return {
        "databaseConnected": True,
        "databaseType": "SQLite / SQLAlchemy ORM",
        "version": "v2.5.0-FastAPI",
        "totalUsers": db.query(User).count(),
        "totalProjects": db.query(Project).count(),
        "totalTasks": db.query(Task).count(),
        "status": "Healthy"
    }

@router.post("/reset")
def reset_database(db: Session = Depends(get_db)):
    init_db()
    return {"success": True, "message": "Database successfully reseeded with default demo data."}
