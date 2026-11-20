# backend/app/routers/admin.py
import json
from typing import Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db.database import get_db, SQLALCHEMY_DATABASE_URL
from backend.app.models.models import User, Project, Task, Role, Setting
from backend.app.core.deps import require_roles, get_current_user

router = APIRouter(prefix="/api/admin", tags=["Admin Portal"])

VALID_ROLES = {"Admin", "Master", "Worker"}


@router.get("/users")
def list_admin_users(current_user: User = Depends(require_roles(["Admin"])), db: Session = Depends(get_db)):
    return [u.to_dict() for u in db.query(User).all()]


@router.put("/users/{user_id}/role")
def update_user_role(user_id: str, payload: Dict[str, str],
                     current_user: User = Depends(require_roles(["Admin"])), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_role = payload.get("role")
    if new_role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Role must be Admin, Master or Worker")
    role_obj = db.query(Role).filter(Role.name == new_role).first()
    user.role = new_role
    user.role_id = role_obj.id if role_obj else None
    db.commit()
    return {"success": True, "message": f"Role updated to {new_role}", "user": user.to_dict()}


@router.get("/roles")
def get_roles_summary(current_user: User = Depends(require_roles(["Admin"])), db: Session = Depends(get_db)):
    users = db.query(User).all()
    dist = {}
    for u in users:
        dist[u.role] = dist.get(u.role, 0) + 1
    return {
        "roles": [
            {"id": "Admin", "name": "Administrator",
             "description": "Full access to all modules, users, settings and reports",
             "usersCount": dist.get("Admin", 0)},
            {"id": "Master", "name": "Master",
             "description": "Project & task oversight, employee monitoring and operational reports",
             "usersCount": dist.get("Master", 0)},
            {"id": "Worker", "name": "Worker",
             "description": "Assigned projects/tasks, timesheets, calendar and personal performance",
             "usersCount": dist.get("Worker", 0)},
        ]
    }


@router.get("/diagnostics")
def get_system_diagnostics(current_user: User = Depends(require_roles(["Admin"])), db: Session = Depends(get_db)):
    engine_type = "MySQL / MariaDB" if SQLALCHEMY_DATABASE_URL.startswith("mysql") else "SQLite"
    return {
        "databaseConnected": True,
        "databaseType": engine_type,
        "version": "v3.0.0-FastAPI",
        "totalUsers": db.query(User).count(),
        "totalProjects": db.query(Project).count(),
        "totalTasks": db.query(Task).count(),
        "status": "Healthy",
    }


DEFAULT_SETTINGS = {
    "companyName": "ProjectMatrix",
    "idleThresholdMinutes": 15,
    "timesheetMaxImages": 5,
    "workingHoursPerDay": 8,
    "notifyOnIdle": True,
    "notifyOnTimesheet": True,
}


@router.get("/settings")
def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(Setting).filter(Setting.key == "app_settings").first()
    if not row:
        return DEFAULT_SETTINGS
    try:
        return {**DEFAULT_SETTINGS, **json.loads(row.value)}
    except Exception:
        return DEFAULT_SETTINGS


@router.put("/settings")
def update_settings(payload: Dict, current_user: User = Depends(require_roles(["Admin"])), db: Session = Depends(get_db)):
    row = db.query(Setting).filter(Setting.key == "app_settings").first()
    merged = {**DEFAULT_SETTINGS, **payload}
    if row:
        row.value = json.dumps(merged)
    else:
        db.add(Setting(key="app_settings", value=json.dumps(merged)))
    db.commit()
    return merged
