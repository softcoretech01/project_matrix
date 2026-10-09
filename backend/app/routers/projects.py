# backend/app/routers/projects.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.models.project import Project, ProjectMember
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut, ProjectMemberAdd, ProjectMemberOut
from app.core.deps import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectOut])
def get_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    # Format field mappings for frontend compatibility
    return [
        ProjectOut(
            id=p.id,
            name=p.name,
            code=p.code,
            description=p.description,
            ownerId=p.owner_id,
            status=p.status,
            reviewRequired=p.review_required,
            startDate=p.start_date,
            endDate=p.end_date
        )
        for p in projects
    ]

@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectOut(
        id=p.id,
        name=p.name,
        code=p.code,
        description=p.description,
        ownerId=p.owner_id,
        status=p.status,
        reviewRequired=p.review_required,
        startDate=p.start_date,
        endDate=p.end_date
    )

@router.post("", response_model=ProjectOut)
def create_project(proj_in: ProjectCreate, db: Session = Depends(get_db)):
    count = db.query(Project).count()
    new_id = f"PRJ-{str(count + 1).zfill(2)}"
    new_code = proj_in.code or f"PRJ-{str(count + 1).zfill(2)}"

    project = Project(
        id=new_id,
        code=new_code,
        name=proj_in.name,
        description=proj_in.description,
        owner_id=proj_in.ownerId,
        status=proj_in.status or "Active",
        review_required=proj_in.reviewRequired if proj_in.reviewRequired is not None else True,
        start_date=proj_in.startDate,
        end_date=proj_in.endDate
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectOut(
        id=project.id,
        name=project.name,
        code=project.code,
        description=project.description,
        ownerId=project.owner_id,
        status=project.status,
        reviewRequired=project.review_required,
        startDate=project.start_date,
        endDate=project.end_date
    )

@router.put("/{project_id}", response_model=ProjectOut)
def update_project(project_id: str, proj_in: ProjectUpdate, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    if proj_in.name is not None:
        p.name = proj_in.name
    if proj_in.description is not None:
        p.description = proj_in.description
    if proj_in.ownerId is not None:
        p.owner_id = proj_in.ownerId
    if proj_in.status is not None:
        p.status = proj_in.status
    if proj_in.reviewRequired is not None:
        p.review_required = proj_in.reviewRequired
    if proj_in.startDate is not None:
        p.start_date = proj_in.startDate
    if proj_in.endDate is not None:
        p.end_date = proj_in.endDate

    db.commit()
    db.refresh(p)
    return ProjectOut(
        id=p.id,
        name=p.name,
        code=p.code,
        description=p.description,
        ownerId=p.owner_id,
        status=p.status,
        reviewRequired=p.review_required,
        startDate=p.start_date,
        endDate=p.end_date
    )

@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(p)
    db.commit()
    return {"success": True, "message": "Project deleted"}

# Project Members Endpoints
@router.get("/{project_id}/members", response_model=List[ProjectMemberOut])
def get_project_members(project_id: str, db: Session = Depends(get_db)):
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    return [
        ProjectMemberOut(
            id=m.id,
            projectId=m.project_id,
            employeeId=m.employee_id,
            role=m.role
        )
        for m in members
    ]

@router.post("/{project_id}/members", response_model=ProjectMemberOut)
def add_project_member(project_id: str, member_in: ProjectMemberAdd, db: Session = Depends(get_db)):
    count = db.query(ProjectMember).count()
    new_id = f"MEM-{str(count + 1).zfill(2)}"
    member = ProjectMember(
        id=new_id,
        project_id=project_id,
        employee_id=member_in.employeeId,
        role=member_in.role or "Member"
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return ProjectMemberOut(
        id=member.id,
        projectId=member.project_id,
        employeeId=member.employee_id,
        role=member.role
    )

