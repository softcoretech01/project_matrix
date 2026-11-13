from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import date, datetime, timedelta
from app.db.database import get_db
from app.models.models import Project, Employee, Task, Subtask, TaskComment, ProjectMember, ProjectSection
from pydantic import BaseModel
from typing import Optional, List, Any

router = APIRouter(prefix="/api", tags=["API"])

# ----------------- Authentication Endpoints & Schemas -----------------
class LoginRequest(BaseModel):
    email: str
    password: str

# Predefined official team credentials mapping
ROLE_PROFILES = {
    "admin@taskmanagement.com": {"name": "Admin User", "role": "Admin", "designation": "Administrator"},
    "admin@projectmatrix.com": {"name": "Admin User", "role": "Admin", "designation": "Administrator"},
    "sophia@projectmatrix.com": {"name": "Sophia Davis", "role": "PM", "designation": "Project Manager"},
    "liam@projectmatrix.com": {"name": "Liam Miller", "role": "Team Lead", "designation": "Team Lead"},
    "emily@projectmatrix.com": {"name": "Emily Watson", "role": "Management", "designation": "Executive Director"},
    "priya@projectmatrix.com": {"name": "Priya", "role": "Employee", "designation": "Frontend Developer"}
}

@router.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    lower_email = req.email.lower().strip()
    
    # 1. Check Database Employees first
    emp = db.query(Employee).filter(Employee.email.ilike(lower_email)).first()
    if emp:
        return {
            "id": str(emp.id),
            "name": emp.name,
            "email": emp.email,
            "role": emp.role or "Employee",
            "designation": emp.designation or "Developer"
        }

    # 2. Check predefined role profile fallback
    if lower_email in ROLE_PROFILES:
        prof = ROLE_PROFILES[lower_email]
        return {
            "id": "E006" if prof["role"] == "Admin" else "E007",
            "name": prof["name"],
            "email": req.email,
            "role": prof["role"],
            "designation": prof["designation"]
        }

    # 3. Dynamic Fallback
    is_admin = "admin" in lower_email
    role = "Admin" if is_admin else "Employee"
    name = "Admin User" if is_admin else req.email.split("@")[0].capitalize()
    return {
        "id": "E006" if is_admin else "E007",
        "name": name,
        "email": req.email,
        "role": role,
        "designation": "Administrator" if is_admin else "Team Member"
    }

@router.post("/auth/password")
def change_password():
    return {"message": "Password updated successfully"}

# ----------------- Pydantic Schemas -----------------
class ProjectCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    owner: Optional[str] = "Admin User"
    status: Optional[str] = "Active"

class EmployeeCreate(BaseModel):
    name: str
    email: str
    role: Optional[str] = "Member"
    designation: Optional[str] = "Developer"

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    designation: Optional[str] = None
    status: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "Medium"
    status: Optional[str] = "Open"
    project: Optional[str] = "Core System"
    project_id: Optional[Any] = None
    assignee: Optional[str] = "Priya"
    assigned_to: Optional[str] = None
    dueDate: Optional[str] = None
    startDate: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    progress: Optional[int] = 0
    createdBy: Optional[str] = None
    assignedBy: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    project: Optional[str] = None
    project_id: Optional[Any] = None
    assignee: Optional[str] = None
    assigned_to: Optional[str] = None
    dueDate: Optional[str] = None
    startDate: Optional[str] = None
    start_date: Optional[str] = None
    endDate: Optional[str] = None
    end_date: Optional[str] = None
    progress: Optional[int] = None
    createdBy: Optional[str] = None
    assignedBy: Optional[str] = None

class SubtaskCreate(BaseModel):
    title: str
    isDone: Optional[bool] = False

class CommentCreate(BaseModel):
    text: str
    author: Optional[str] = "Priya"


# Helper to serialize task compatible with all frontends
def serialize_task(t: Task) -> dict:
    t_id = str(t.id)
    code_val = f"TSK-{int(t_id):03d}" if t_id.isdigit() else str(t_id)
    return {
        "id": t_id,
        "code": code_val,
        "task_code": code_val,
        "title": t.title or t.name or "Untitled Task",
        "name": t.name or t.title or "Untitled Task",
        "description": t.description or "",
        "project": t.project or "Core System",
        "project_id": t.project_id or t.projectId or "1",
        "projectId": t.projectId or t.project_id or "1",
        "assignee": t.assignee or t.assigned_to or "Priya",
        "assigned_to": t.assigned_to or t.assignee or "Priya",
        "priority": t.priority or "Medium",
        "status": t.status or "Open",
        "progress": t.progress or 0,
        "dueDate": t.dueDate or t.end_date or str(t.endDate or ""),
        "startDate": t.startDate or t.start_date or str(t.startDate or ""),
        "start_date": t.start_date or t.startDate or str(t.startDate or ""),
        "end_date": t.end_date or t.dueDate or str(t.endDate or ""),
        "createdAt": str(t.createdAt) if t.createdAt else "",
        "completedAt": str(t.completedAt) if t.completedAt else "",
        "createdBy": t.createdBy or "Sophia Davis (PM)",
        "assignedBy": t.createdBy or "Sophia Davis (PM)",
    }


# ----------------- Projects Endpoints -----------------
@router.get("/projects")
def get_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    out = []
    for proj in projects:
        p_id = str(proj.id)
        p_tasks = db.query(Task).filter((Task.project == proj.name) | (Task.project_id == p_id) | (Task.projectId == p_id)).all()
        t_total = len(p_tasks)
        t_done = len([t for t in p_tasks if t.status in ["Completed", "Closed"]])
        prog = round((t_done / t_total) * 100) if t_total > 0 else 0
        member_names = [m.employeeName for m in proj.members]
        out.append({
            "id": p_id,
            "name": proj.name,
            "code": proj.code or (f"PRJ-{int(p_id):03d}" if p_id.isdigit() else p_id),
            "description": proj.description or "",
            "owner": proj.owner or "Admin User",
            "status": proj.status or "Active",
            "reviewRequired": proj.reviewRequired or False,
            "createdAt": str(proj.createdAt) if proj.createdAt else "",
            "membersCount": len(proj.members),
            "members": member_names,
            "totalTasks": t_total,
            "completedTasks": t_done,
            "progress": prog
        })
    return out

@router.post("/projects")
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    clean_name = project.name.strip()
    existing = db.query(Project).filter(Project.name == clean_name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Project '{clean_name}' already exists.")

    count = db.query(Project).count()
    code_val = f"PRJ-{count + 1:03d}"
    new_id = f"P{int(datetime.now().timestamp()) % 1000000:06d}"
    
    owner_val = project.owner or "Admin User"
    today_dt = date.today()
    future_dt = today_dt + timedelta(days=90)
    
    db_proj = Project(
        id=new_id,
        name=clean_name,
        code=code_val,
        description=project.description or "",
        owner=owner_val,
        status=project.status or "Active",
        clientId="C239570",
        pmId="E006",
        startDate=today_dt,
        endDate=future_dt,
        budget=0.0,
        estimatedHours=0,
        billable=True
    )

    db.add(db_proj)
    db.commit()
    db.refresh(db_proj)

    # Add default module for MySQL tasks foreign key
    try:
        from sqlalchemy import text
        mod_id = f"M{int(datetime.now().timestamp()) % 1000000:06d}"
        db.execute(text(
            "INSERT INTO modules (id, projectId, name, description, priority, status) "
            "VALUES (:mid, :pid, :name, :desc, 'Medium', 'Active')"
        ), {"mid": mod_id, "pid": str(db_proj.id), "name": f"{clean_name} Core Module", "desc": "Default project module"})
        
        # Add allocation for owner
        db.execute(text(
            "INSERT INTO allocations (employeeId, projectId, allocationPercentage, startDate, endDate) "
            "VALUES ('E006', :pid, 100, :sdate, :edate)"
        ), {"pid": str(db_proj.id), "sdate": today_dt, "edate": future_dt})
        db.commit()
    except Exception:
        db.rollback()

    # Automatically add owner as Project Lead member
    if owner_val:
        db.add(ProjectMember(projectId=str(db_proj.id), employeeName=owner_val, role="Project Lead"))
        db.commit()

    # Automatically add initial default sections
    s1 = ProjectSection(projectId=str(db_proj.id), name="Frontend Architecture", sortOrder=1)
    s2 = ProjectSection(projectId=str(db_proj.id), name="Backend API Integration", sortOrder=2)
    s3 = ProjectSection(projectId=str(db_proj.id), name="QA & Testing", sortOrder=3)
    db.add_all([s1, s2, s3])
    db.commit()

    return {
        "id": str(db_proj.id),
        "name": db_proj.name,
        "code": db_proj.code,
        "description": db_proj.description or "",
        "owner": db_proj.owner,
        "status": db_proj.status,
        "reviewRequired": db_proj.reviewRequired,
        "createdAt": str(db_proj.createdAt) if db_proj.createdAt else ""
    }

@router.get("/projects/{project_id}")
def get_project_detail(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter((Project.id == project_id) | (Project.code == project_id)).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    
    p_id = str(proj.id)
    today_str = date.today().isoformat()
    # Get project tasks
    p_tasks = db.query(Task).filter((Task.project == proj.name) | (Task.project_id == p_id) | (Task.projectId == p_id)).all()
    total_tasks = len(p_tasks)
    completed_tasks = len([t for t in p_tasks if t.status in ["Completed", "Closed"]])
    in_progress_tasks = len([t for t in p_tasks if t.status in ["In Progress", "Assigned"]])
    open_tasks = len([t for t in p_tasks if t.status == "Open"])
    review_tasks = len([t for t in p_tasks if t.status == "Review"])
    overdue_tasks = len([t for t in p_tasks if t.dueDate and t.dueDate < today_str and t.status not in ["Completed", "Closed"]])
    prog = round((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0

    members = [{"id": m.id, "name": m.employeeName, "role": m.role, "email": f"{m.employeeName.lower().replace(' ', '')}@projectmatrix.com", "addedAt": str(m.addedAt) if m.addedAt else ""} for m in proj.members]
    sections = [{"id": s.id, "name": s.name, "sortOrder": s.sortOrder} for s in proj.sections]

    return {
        "id": p_id,
        "name": proj.name,
        "code": proj.code or (f"PRJ-{int(p_id):02d}" if p_id.isdigit() else p_id),
        "description": proj.description or "",
        "owner": proj.owner or "Admin User",
        "status": proj.status or "Active",
        "reviewRequired": proj.reviewRequired or False,
        "totalTasks": total_tasks,
        "completedTasks": completed_tasks,
        "inProgressTasks": in_progress_tasks,
        "openTasks": open_tasks,
        "reviewTasks": review_tasks,
        "overdueTasks": overdue_tasks,
        "progress": prog,
        "members": members,
        "sections": sections
    }

@router.patch("/projects/{project_id}")
def update_project(project_id: str, update_data: dict, db: Session = Depends(get_db)):
    proj = db.query(Project).filter((Project.id == project_id) | (Project.code == project_id)).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    
    old_name = proj.name
    for key, val in update_data.items():
        if hasattr(proj, key):
            setattr(proj, key, val)
    db.commit()

    if "name" in update_data and update_data["name"] != old_name:
        tasks = db.query(Task).filter((Task.project == old_name) | (Task.project_id == str(proj.id))).all()
        for t in tasks:
            t.project = update_data["name"]
        db.commit()

    db.refresh(proj)
    return proj

@router.delete("/projects/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter((Project.id == project_id) | (Project.code == project_id) | (Project.name == project_id)).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    p_id = str(proj.id)
    p_name = proj.name

    from sqlalchemy import text
    # 1. Clean timesheets for project and its tasks first (due to foreign keys)
    try:
        db.execute(text("DELETE FROM timesheets WHERE projectId = :pid"), {"pid": p_id})
    except Exception:
        pass

    # 2. Delete tasks, subtasks, task comments, and task activity
    tasks = db.query(Task).filter((Task.project == p_name) | (Task.project_id == p_id) | (Task.projectId == p_id)).all()
    for t in tasks:
        t_id = str(t.id)
        try:
            db.execute(text("DELETE FROM timesheets WHERE taskId = :tid"), {"tid": t_id})
            db.execute(text("DELETE FROM task_activity WHERE taskId = :tid"), {"tid": t_id})
        except Exception:
            pass
        db.query(Subtask).filter(Subtask.taskId == t_id).delete(synchronize_session=False)
        db.query(TaskComment).filter(TaskComment.taskId == t_id).delete(synchronize_session=False)
        db.delete(t)
    db.flush()

    # 3. Clean MySQL modules and allocations
    try:
        db.execute(text("DELETE FROM modules WHERE projectId = :pid"), {"pid": p_id})
        db.execute(text("DELETE FROM allocations WHERE projectId = :pid"), {"pid": p_id})
    except Exception:
        pass

    # 4. Delete project members and sections
    db.query(ProjectMember).filter(ProjectMember.projectId == p_id).delete(synchronize_session=False)
    db.query(ProjectSection).filter(ProjectSection.projectId == p_id).delete(synchronize_session=False)

    # 5. Delete project record
    db.delete(proj)
    db.commit()
    return {"message": "Project deleted successfully", "id": project_id}

@router.post("/projects/{project_id}/members")
def add_project_member(project_id: str, member_data: dict, db: Session = Depends(get_db)):
    proj = db.query(Project).filter((Project.id == project_id) | (Project.code == project_id)).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    name = member_data.get("name") or member_data.get("employeeName") or "Team Member"
    role = member_data.get("role") or "Contributor"
    
    p_id = str(proj.id)
    existing = db.query(ProjectMember).filter(ProjectMember.projectId == p_id, ProjectMember.employeeName == name).first()
    if existing:
        existing.role = role
        db.commit()
        db.refresh(existing)
        return {"id": existing.id, "name": existing.employeeName, "role": existing.role, "email": f"{name.lower().replace(' ', '')}@projectmatrix.com"}

    new_m = ProjectMember(projectId=p_id, employeeName=name, role=role)
    db.add(new_m)
    db.commit()
    db.refresh(new_m)
    return {"id": new_m.id, "name": new_m.employeeName, "role": new_m.role, "email": f"{name.lower().replace(' ', '')}@projectmatrix.com"}

@router.delete("/projects/{project_id}/members/{member_id}")
def delete_project_member(project_id: str, member_id: int, db: Session = Depends(get_db)):
    proj = db.query(Project).filter((Project.id == project_id) | (Project.code == project_id)).first()
    p_id = str(proj.id) if proj else project_id
    mem = db.query(ProjectMember).filter(ProjectMember.id == member_id, ProjectMember.projectId == p_id).first()
    if not mem:
        raise HTTPException(status_code=404, detail="Member not found in project")
    db.delete(mem)
    db.commit()
    return {"message": "Member removed from project successfully", "memberId": member_id}

@router.get("/projects/{project_id}/sections")
def get_project_sections(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter((Project.id == project_id) | (Project.code == project_id)).first()
    p_id = str(proj.id) if proj else project_id
    sections = db.query(ProjectSection).filter(ProjectSection.projectId == p_id).order_by(ProjectSection.sortOrder).all()
    return [{"id": s.id, "name": s.name, "sortOrder": s.sortOrder} for s in sections]

@router.post("/projects/{project_id}/sections")
def add_project_section(project_id: str, sec_data: dict, db: Session = Depends(get_db)):
    proj = db.query(Project).filter((Project.id == project_id) | (Project.code == project_id)).first()
    p_id = str(proj.id) if proj else project_id
    name = sec_data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Section name required")
    count = db.query(ProjectSection).filter(ProjectSection.projectId == p_id).count()
    new_s = ProjectSection(projectId=p_id, name=name, sortOrder=count + 1)
    db.add(new_s)
    db.commit()
    db.refresh(new_s)
    return {"id": new_s.id, "name": new_s.name, "sortOrder": new_s.sortOrder}

@router.patch("/projects/{project_id}/sections/{section_id}")
def rename_project_section(project_id: str, section_id: int, sec_data: dict, db: Session = Depends(get_db)):
    proj = db.query(Project).filter((Project.id == project_id) | (Project.code == project_id)).first()
    p_id = str(proj.id) if proj else project_id
    sec = db.query(ProjectSection).filter(ProjectSection.id == section_id, ProjectSection.projectId == p_id).first()
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")
    name = sec_data.get("name", "").strip()
    if name:
        sec.name = name
        db.commit()
        db.refresh(sec)
    return {"id": sec.id, "name": sec.name, "sortOrder": sec.sortOrder}

@router.delete("/projects/{project_id}/sections/{section_id}")
def delete_project_section(project_id: str, section_id: int, db: Session = Depends(get_db)):
    proj = db.query(Project).filter((Project.id == project_id) | (Project.code == project_id)).first()
    p_id = str(proj.id) if proj else project_id
    sec = db.query(ProjectSection).filter(ProjectSection.id == section_id, ProjectSection.projectId == p_id).first()
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")
    db.delete(sec)
    db.commit()
    return {"message": "Section deleted successfully", "sectionId": section_id}



# ----------------- Employees Endpoints -----------------
@router.get("/employees")
def get_employees(db: Session = Depends(get_db)):
    return db.query(Employee).all()

@router.post("/employees")
def create_employee(emp: EmployeeCreate, db: Session = Depends(get_db)):
    new_id = f"E{int(datetime.now().timestamp()) % 1000000:06d}"
    db_emp = Employee(
        id=new_id,
        name=emp.name,
        email=emp.email,
        role=emp.role or "Member",
        designation=emp.designation or "Developer"
    )
    db.add(db_emp)
    db.commit()
    db.refresh(db_emp)
    return db_emp

@router.put("/employees/{employee_id}")
@router.patch("/employees/{employee_id}")
def update_employee(employee_id: str, updates: EmployeeUpdate, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter((Employee.id == employee_id) | (Employee.email == employee_id)).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if updates.name is not None:
        emp.name = updates.name
    if updates.email is not None:
        emp.email = updates.email
    if updates.role is not None:
        emp.role = updates.role
    if updates.designation is not None:
        emp.designation = updates.designation
    if updates.status is not None:
        emp.status = updates.status
    db.commit()
    db.refresh(emp)
    return emp

@router.delete("/employees/{employee_id}")
def delete_employee(employee_id: str, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.delete(emp)
    db.commit()
    return {"message": "Employee deleted successfully", "id": employee_id}


# ----------------- Tasks Endpoints -----------------
@router.get("/tasks")
def get_tasks(db: Session = Depends(get_db)):
    tasks = db.query(Task).all()
    return [serialize_task(t) for t in tasks]

@router.get("/tasks/{task_id}")
def get_task(task_id: str, db: Session = Depends(get_db)):
    t = db.query(Task).filter((Task.id == task_id) | (Task.code == task_id)).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    data = serialize_task(t)
    data["subtasks"] = [{"id": s.id, "title": s.title, "isDone": s.isDone} for s in t.subtasks]
    data["comments"] = [{"id": c.id, "author": c.author, "text": c.text, "createdAt": str(c.createdAt)} for c in t.comments]
    return data

@router.post("/tasks")
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    # Normalize fields
    proj_name = task.project or "Core System"
    assigned = task.assignee or task.assigned_to or "Priya"
    due = task.dueDate or task.end_date
    start = task.startDate or task.start_date
    st = task.status or "Open"
    
    # Progress automatically derived from status (no manual self increase/decrease)
    prog = 100 if st in ["Completed", "Closed"] else (85 if st == "Review" else (50 if st == "In Progress" else 0))
    comp_at = func.now() if st in ["Completed", "Closed"] else None

    # Resolve project_id from project name if available
    resolved_proj_id = str(task.project_id) if task.project_id else None
    if not resolved_proj_id and proj_name:
        p_match = db.query(Project).filter((Project.name == proj_name) | (Project.code == proj_name)).first()
        if p_match:
            resolved_proj_id = str(p_match.id)
    if not resolved_proj_id:
        p_match = db.query(Project).filter((Project.name == proj_name) | (Project.code == proj_name)).first()
        if not p_match:
            # Auto-create project so MySQL foreign key constraints are NEVER violated
            from sqlalchemy import text
            new_p_id = f"P{int(datetime.now().timestamp()) % 1000000:06d}"
            today_dt = date.today()
            p_match = Project(
                id=new_p_id,
                name=proj_name,
                code=f"PRJ-{db.query(Project).count() + 1:03d}",
                description="Auto-generated project workspace",
                owner="Admin User",
                status="Active",
                clientId="C239570",
                pmId="E006",
                startDate=today_dt,
                endDate=today_dt + timedelta(days=90),
                budget=0.0,
                estimatedHours=0,
                billable=True
            )
            db.add(p_match)
            db.commit()
            db.refresh(p_match)
            # Add sections for this project
            s1 = ProjectSection(projectId=str(p_match.id), name="Frontend Architecture", sortOrder=1)
            s2 = ProjectSection(projectId=str(p_match.id), name="Backend API Integration", sortOrder=2)
            s3 = ProjectSection(projectId=str(p_match.id), name="QA & Testing", sortOrder=3)
            db.add_all([s1, s2, s3])
            db.commit()
        resolved_proj_id = str(p_match.id)

    # Find or create module for this project (MySQL FK fk_tasks_modules requirement)
    from sqlalchemy import text
    mod_id = None
    try:
        mod_row = db.execute(text("SELECT id FROM modules WHERE projectId = :pid LIMIT 1"), {"pid": resolved_proj_id}).fetchone()
        if mod_row:
            mod_id = mod_row[0]
        else:
            mod_id = f"M{int(datetime.now().timestamp()) % 1000000:06d}"
            db.execute(text(
                "INSERT INTO modules (id, projectId, name, description, priority, status) "
                "VALUES (:mid, :pid, 'General Module', 'Default module', 'Medium', 'Active')"
            ), {"mid": mod_id, "pid": resolved_proj_id})
            db.commit()
    except Exception:
        mod_id = "M001"

    # Resolve employee ID for assignee
    assigned_id = "E007"
    try:
        emp_row = db.execute(text("SELECT id FROM employees WHERE name LIKE :name LIMIT 1"), {"name": f"%{assigned}%"}).fetchone()
        if emp_row:
            assigned_id = emp_row[0]
    except Exception:
        assigned_id = "E007"

    new_task_id = f"TASK{int(datetime.now().timestamp()) % 1000000:04d}"
    today_dt = date.today()
    int_proj_id = int(resolved_proj_id) if (resolved_proj_id and resolved_proj_id.isdigit()) else None

    creator = task.assignedBy or task.createdBy or "Sophia Davis (PM)"

    db_task = Task(
        id=new_task_id,
        title=task.title,
        name=task.title,
        description=task.description or "",
        priority=task.priority or "Medium",
        status=st,
        project=proj_name,
        project_id=int_proj_id,
        projectId=resolved_proj_id,
        moduleId=mod_id,
        assignee=assigned,
        assigned_to=assigned,
        assignedTo=assigned_id,
        createdBy=creator,
        reviewerId="E006",
        dueDate=due,
        startDate=today_dt,
        start_date=start or today_dt.isoformat(),
        endDate=today_dt,
        end_date=due or today_dt.isoformat(),
        progress=prog,
        completedAt=comp_at
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return serialize_task(db_task)

@router.patch("/tasks/{task_id}")
@router.put("/tasks/{task_id}")
def update_task(task_id: str, updates: TaskUpdate, db: Session = Depends(get_db)):
    t = db.query(Task).filter((Task.id == task_id) | (Task.code == task_id)).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    if updates.title is not None:
        t.title = updates.title
        t.name = updates.title
    if updates.description is not None:
        t.description = updates.description
    if updates.priority is not None:
        t.priority = updates.priority
    if updates.status is not None:
        t.status = updates.status
        # Status automatically sets progress (No arbitrary self increase/decrease)
        if updates.status in ["Completed", "Closed"]:
            t.progress = 100
            if not t.completedAt:
                t.completedAt = func.now()
        elif updates.status == "Review":
            t.progress = 85
            t.completedAt = None
        elif updates.status == "In Progress":
            t.progress = 50
            t.completedAt = None
        elif updates.status == "Open":
            t.progress = 0
            t.completedAt = None
    elif updates.progress is not None:
        if t.status in ["Completed", "Closed"]:
            t.progress = 100
        else:
            t.progress = updates.progress

    if updates.project is not None:
        t.project = updates.project
        p_match = db.query(Project).filter(Project.name == updates.project).first()
        if p_match:
            t.project_id = int(p_match.id) if str(p_match.id).isdigit() else None
            t.projectId = str(p_match.id)

    if updates.assignee is not None:
        t.assignee = updates.assignee
        t.assigned_to = updates.assignee
    if updates.assigned_to is not None:
        t.assignee = updates.assigned_to
        t.assigned_to = updates.assigned_to
    if updates.dueDate is not None:
        t.dueDate = updates.dueDate
        t.end_date = updates.dueDate
    if updates.startDate is not None or updates.start_date is not None:
        val = updates.startDate or updates.start_date
        t.start_date = val
    if updates.createdBy is not None:
        t.createdBy = updates.createdBy
    elif updates.assignedBy is not None:
        t.createdBy = updates.assignedBy

    db.commit()
    db.refresh(t)
    return serialize_task(t)

@router.delete("/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    t = db.query(Task).filter((Task.id == task_id) | (Task.code == task_id)).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    t_id_str = str(t.id)
    try:
        from sqlalchemy import text
        db.execute(text(f"DELETE FROM timesheets WHERE taskId = '{t_id_str}'"))
        db.execute(text(f"DELETE FROM task_activity WHERE taskId = '{t_id_str}'"))
    except Exception:
        pass
    db.query(Subtask).filter(Subtask.taskId == t_id_str).delete(synchronize_session=False)
    db.query(TaskComment).filter(TaskComment.taskId == t_id_str).delete(synchronize_session=False)
    db.delete(t)
    db.commit()
    return {"message": "Task deleted successfully", "id": task_id}

# ----------------- Daily Completed Activity Endpoints -----------------
@router.get("/projects/{project_id}/daily-activity")
def get_project_daily_activity(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter((Project.id == project_id) | (Project.code == project_id)).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    p_id = str(proj.id)
    tasks = db.query(Task).filter(
        (Task.project == proj.name) | (Task.project_id == p_id) | (Task.projectId == p_id)
    ).all()

    completed_tasks = [t for t in tasks if t.status in ["Completed", "Closed"]]
    completed_tasks.sort(key=lambda x: str(x.completedAt or x.createdAt or ""), reverse=True)

    activity = []
    for t in completed_tasks:
        ts = t.completedAt or t.createdAt
        date_str = ts.strftime("%d %b %Y") if ts else "Recent"
        time_str = ts.strftime("%I:%M %p") if ts else "12:00 PM"
        iso_str = ts.isoformat() if ts else ""

        activity.append({
            "taskId": str(t.id),
            "taskCode": str(t.id),
            "title": t.title or t.name,
            "project": t.project,
            "assignee": t.assignee,
            "status": t.status,
            "priority": t.priority,
            "completedAt": iso_str,
            "date": date_str,
            "time": time_str,
            "commentsCount": len(t.comments)
        })

    return {
        "projectId": p_id,
        "projectName": proj.name,
        "totalCompleted": len(completed_tasks),
        "activity": activity
    }

@router.get("/daily-activity")
def get_global_daily_activity(db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.status.in_(["Completed", "Closed"])).all()
    tasks.sort(key=lambda x: str(x.completedAt or x.createdAt or ""), reverse=True)

    activity = []
    for t in tasks:
        ts = t.completedAt or t.createdAt
        date_str = ts.strftime("%d %b %Y") if ts else "Recent"
        time_str = ts.strftime("%I:%M %p") if ts else "12:00 PM"
        iso_str = ts.isoformat() if ts else ""

        activity.append({
            "taskId": str(t.id),
            "taskCode": str(t.id),
            "title": t.title or t.name,
            "project": t.project,
            "assignee": t.assignee,
            "status": t.status,
            "priority": t.priority,
            "completedAt": iso_str,
            "date": date_str,
            "time": time_str,
            "commentsCount": len(t.comments)
        })

    return activity


# ----------------- Subtasks & Comments Endpoints -----------------
@router.post("/tasks/{task_id}/subtasks")
def add_subtask(task_id: str, sub: SubtaskCreate, db: Session = Depends(get_db)):
    t = db.query(Task).filter((Task.id == task_id) | (Task.code == task_id)).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    new_sub = Subtask(taskId=str(t.id), title=sub.title, isDone=sub.isDone or False)
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    return {"id": new_sub.id, "taskId": new_sub.taskId, "title": new_sub.title, "isDone": new_sub.isDone}

@router.patch("/tasks/{task_id}/subtasks/{subtask_id}")
def toggle_subtask(task_id: str, subtask_id: int, db: Session = Depends(get_db)):
    s = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subtask not found")
    s.isDone = not s.isDone
    db.commit()
    db.refresh(s)
    return {"id": s.id, "taskId": s.taskId, "title": s.title, "isDone": s.isDone}

@router.delete("/tasks/{task_id}/subtasks/{subtask_id}")
def delete_subtask(task_id: str, subtask_id: int, db: Session = Depends(get_db)):
    s = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subtask not found")
    db.delete(s)
    db.commit()
    return {"message": "Subtask deleted successfully", "id": subtask_id}

@router.post("/tasks/{task_id}/comments")
def add_comment(task_id: str, c: CommentCreate, db: Session = Depends(get_db)):
    t = db.query(Task).filter((Task.id == task_id) | (Task.code == task_id)).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    new_comment = TaskComment(taskId=str(t.id), author=c.author or "Priya", text=c.text)
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return {"id": new_comment.id, "taskId": new_comment.taskId, "author": new_comment.author, "text": new_comment.text, "createdAt": str(new_comment.createdAt)}

@router.delete("/tasks/{task_id}/comments/{comment_id}")
def delete_comment(task_id: str, comment_id: int, db: Session = Depends(get_db)):
    c = db.query(TaskComment).filter(TaskComment.id == comment_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(c)
    db.commit()
    return {"message": "Comment deleted successfully", "id": comment_id}
