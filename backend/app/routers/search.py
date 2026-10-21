from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.models.models import Task, Project, User

router = APIRouter(prefix="/api/search", tags=["search"])

@router.get("")
def global_search(q: str = "", db: Session = Depends(get_db)):
    if not q or len(q.strip()) == 0:
        return {"tasks": [], "projects": [], "employees": []}

    term = f"%{q.strip().lower()}%"
    
    tasks = db.query(Task).filter(
        (Task.name.ilike(term)) |
        (Task.id.ilike(term)) |
        (Task.description.ilike(term))
    ).limit(10).all()

    projects = db.query(Project).filter(
        (Project.name.ilike(term)) |
        (Project.id.ilike(term)) |
        (Project.description.ilike(term))
    ).limit(10).all()

    employees = db.query(User).filter(
        (User.name.ilike(term)) |
        (User.email.ilike(term)) |
        (User.designation.ilike(term))
    ).limit(10).all()

    return {
        "tasks": [t.to_dict() for t in tasks],
        "projects": [p.to_dict() for p in projects],
        "employees": [e.to_dict() for e in employees]
    }

