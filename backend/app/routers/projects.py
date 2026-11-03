# backend/app/routers/projects.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import random

from backend.app.db.database import get_db
from backend.app.models.models import Project, Task, Section, ProjectMember

router = APIRouter(prefix="/api/projects", tags=["projects"])

class ProjectCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = ""
    ownerId: Optional[str] = ""
    status: Optional[str] = "Active"
    reviewRequired: Optional[bool] = True
    startDate: Optional[str] = None
    endDate: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    ownerId: Optional[str] = None
    status: Optional[str] = None
    reviewRequired: Optional[bool] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None

class ProjectMemberAdd(BaseModel):
    employeeId: str
    role: Optional[str] = "Member"

@router.get("")
def get_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    results = []
    for p in projects:
        d = p.to_dict()
        tasks = db.query(Task).filter(Task.project_id == p.id).all()
        d["tasksCount"] = len(tasks)
        d["completedTasksCount"] = sum(1 for t in tasks if t.status == "Completed")
        results.append(d)
    return results

@router.post("")
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    count = db.query(Project).count() + 1
    new_id = f"PRJ-{count:02d}"
    while db.query(Project).filter(Project.id == new_id).first():
        new_id = f"PRJ-{random.randint(10, 99)}"

    proj = Project(
        id=new_id,
        code=data.code or new_id,
        name=data.name,
        description=data.description or "",
        owner_id=data.ownerId or "",
        status=data.status or "Active",
        review_required=data.reviewRequired if data.reviewRequired is not None else True,
        start_date=data.startDate or "",
        end_date=data.endDate or ""
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)

    d = proj.to_dict()
    d["tasksCount"] = 0
    d["completedTasksCount"] = 0
    return d

@router.get("/{project_id}")
def get_project_detail(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    sections = db.query(Section).filter(Section.project_id == project_id).order_by(Section.sort_order.asc()).all()

    d = proj.to_dict()
    d["tasks"] = [t.to_dict() for t in tasks]
    d["sections"] = [s.to_dict() for s in sections]
    d["tasksCount"] = len(tasks)
    d["completedTasksCount"] = sum(1 for t in tasks if t.status == "Completed")
    return d

@router.put("/{project_id}")
def update_project(project_id: str, data: ProjectUpdate, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    if data.name is not None:
        proj.name = data.name
    if data.code is not None:
        proj.code = data.code
    if data.description is not None:
        proj.description = data.description
    if data.ownerId is not None:
        proj.owner_id = data.ownerId
    if data.status is not None:
        proj.status = data.status
    if data.reviewRequired is not None:
        proj.review_required = data.reviewRequired
    if data.startDate is not None:
        proj.start_date = data.startDate
    if data.endDate is not None:
        proj.end_date = data.endDate

    db.commit()
    db.refresh(proj)
    return proj.to_dict()

@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(proj)
    db.commit()
    return {"success": True, "message": "Project deleted successfully"}

# Project Members Endpoints
@router.get("/{project_id}/members")
def get_project_members(project_id: str, db: Session = Depends(get_db)):
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    return [m.to_dict() for m in members]

@router.post("/{project_id}/members")
def add_project_member(project_id: str, member_in: ProjectMemberAdd, db: Session = Depends(get_db)):
    count = db.query(ProjectMember).count() + 1
    new_id = f"MEM-{count:02d}"
    while db.query(ProjectMember).filter(ProjectMember.id == new_id).first():
        new_id = f"MEM-{random.randint(10, 99)}"

    member = ProjectMember(
        id=new_id,
        project_id=project_id,
        employee_id=member_in.employeeId,
        role=member_in.role or "Member"
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member.to_dict()
