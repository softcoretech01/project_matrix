# backend/app/routers/projects.py
import random
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.db.database import get_db
from backend.app.models.models import (
    Project, Task, Section, ProjectMember, ProjectAttachment, User,
)
from backend.app.core.deps import get_current_user
from backend.app.core.storage import save_upload, delete_file, DOC_EXTS

router = APIRouter(prefix="/api/projects", tags=["projects"])
DONE = ("Completed", "Closed")


class ProjectCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = ""
    ownerId: Optional[str] = ""
    priority: Optional[str] = "Medium"
    status: Optional[str] = "Not Started"
    progress: Optional[int] = 0
    reviewRequired: Optional[bool] = True
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    memberIds: Optional[list] = None


class ProjectPatch(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    ownerId: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    reviewRequired: Optional[bool] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None


class ProjectMemberAdd(BaseModel):
    employeeId: str
    role: Optional[str] = "Member"


def _visible_projects(db: Session, user: User):
    if user.role == "Worker":
        member_pids = {m.project_id for m in
                       db.query(ProjectMember).filter(ProjectMember.employee_id == user.id).all()}
        task_pids = {t.project_id for t in
                     db.query(Task).filter(Task.assigned_to == user.id).all() if t.project_id}
        owned = {p.id for p in db.query(Project).filter(Project.owner_id == user.id).all()}
        pids = member_pids | task_pids | owned
        return db.query(Project).filter(Project.id.in_(pids)).all() if pids else []
    return db.query(Project).all()


def _enrich(db: Session, p: Project) -> dict:
    tasks = db.query(Task).filter(Task.project_id == p.id).all()
    d = p.to_dict()
    d["tasksCount"] = len(tasks)
    d["completedTasksCount"] = sum(1 for t in tasks if t.status in DONE)
    d["memberCount"] = db.query(ProjectMember).filter(ProjectMember.project_id == p.id).count()
    # auto progress from tasks if project progress is 0 and tasks exist
    if (not p.progress) and tasks:
        d["progress"] = int(sum(1 for t in tasks if t.status in DONE) / len(tasks) * 100)
    return d


@router.get("")
def get_projects(search: Optional[str] = None, status: Optional[str] = None,
                 current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = _visible_projects(db, current_user)
    if search:
        s = search.strip().lower()
        projects = [p for p in projects if s in (p.name or "").lower() or s in (p.id or "").lower()
                    or s in (p.description or "").lower()]
    if status and status not in ("All", ""):
        projects = [p for p in projects if p.status == status]
    return [_enrich(db, p) for p in projects]


@router.post("")
def create_project(data: ProjectCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "Worker":
        raise HTTPException(status_code=403, detail="Workers cannot create projects")
    n = db.query(Project).count() + 1
    new_id = f"PRJ-{n:02d}"
    while db.query(Project).filter(Project.id == new_id).first():
        new_id = f"PRJ-{random.randint(10, 999)}"
    proj = Project(
        id=new_id, code=data.code or new_id, name=data.name, description=data.description or "",
        owner_id=current_user.id, priority=data.priority or "Medium",
        status=data.status or "Not Started", progress=data.progress or 0,
        review_required=data.reviewRequired if data.reviewRequired is not None else True,
        start_date=data.startDate or "", end_date=data.endDate or "",
    )
    db.add(proj)
    db.flush()
    if data.memberIds:
        for i, emp in enumerate(data.memberIds):
            db.add(ProjectMember(id=f"MEM-{random.randint(1000,999999)}", project_id=new_id,
                                 employee_id=emp, role="Member"))
    db.commit()
    db.refresh(proj)
    return _enrich(db, proj)


@router.get("/{project_id}")
def get_project_detail(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    sections = db.query(Section).filter(Section.project_id == project_id).order_by(Section.sort_order).all()
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    attachments = db.query(ProjectAttachment).filter(ProjectAttachment.project_id == project_id).all()
    d = _enrich(db, proj)
    d["tasks"] = [t.to_dict() for t in tasks]
    d["sections"] = [s.to_dict() for s in sections]
    d["members"] = [m.to_dict() for m in members]
    d["attachments"] = [a.to_dict() for a in attachments]
    return d


@router.put("/{project_id}")
def update_project(project_id: str, data: ProjectPatch,
                   current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "Worker":
        raise HTTPException(status_code=403, detail="Workers cannot edit projects")
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    cols = {"name": "name", "code": "code", "description": "description",
            "priority": "priority", "status": "status", "progress": "progress",
            "reviewRequired": "review_required", "startDate": "start_date", "endDate": "end_date"}
    for field, col in cols.items():
        val = getattr(data, field)
        if val is not None:
            setattr(proj, col, val)
    db.commit()
    db.refresh(proj)
    return _enrich(db, proj)


@router.delete("/{project_id}")
def delete_project(project_id: str, force: bool = False,
                   current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ("Admin", "Master"):
        raise HTTPException(status_code=403, detail="Not permitted")
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    task_count = db.query(Task).filter(Task.project_id == project_id).count()
    if task_count > 0 and not force:
        raise HTTPException(
            status_code=409,
            detail=f"This project has {task_count} task(s). Deleting it will unlink them. "
                   f"Confirm to proceed.")
    for a in db.query(ProjectAttachment).filter(ProjectAttachment.project_id == project_id).all():
        delete_file("projects", a.filename)
    db.delete(proj)
    db.commit()
    return {"success": True, "message": "Project deleted successfully"}


# ---------- members ----------
@router.get("/{project_id}/members")
def get_members(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [m.to_dict() for m in db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()]


@router.post("/{project_id}/members")
def add_member(project_id: str, body: ProjectMemberAdd,
               current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "Worker":
        raise HTTPException(status_code=403, detail="Not permitted")
    exists = db.query(ProjectMember).filter(ProjectMember.project_id == project_id,
                                            ProjectMember.employee_id == body.employeeId).first()
    if exists:
        raise HTTPException(status_code=400, detail="Employee is already a member")
    m = ProjectMember(id=f"MEM-{random.randint(1000,999999)}", project_id=project_id,
                      employee_id=body.employeeId, role=body.role or "Member")
    db.add(m)
    db.commit()
    db.refresh(m)
    return m.to_dict()


@router.delete("/{project_id}/members/{member_id}")
def remove_member(project_id: str, member_id: str,
                  current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(ProjectMember).filter(ProjectMember.id == member_id).first()
    if m:
        db.delete(m)
        db.commit()
    return {"success": True}


# ---------- attachments ----------
@router.post("/{project_id}/attachments")
def upload_project_attachment(project_id: str, file: UploadFile = File(...),
                              current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    saved = save_upload(file, "projects", allowed=DOC_EXTS)
    att = ProjectAttachment(project_id=project_id, filename=saved["filename"],
                            filepath=saved["filepath"], uploaded_by=current_user.id)
    db.add(att)
    db.commit()
    db.refresh(att)
    return att.to_dict()
