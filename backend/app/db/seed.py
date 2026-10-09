# backend/app/db/seed.py
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.module import Module
from app.models.label import Label
from app.models.task import Task, Subtask
from app.models.master import Client, Department, Designation
from datetime import datetime

def seed_database(db: Session):
    # Only seed if no users exist
    if db.query(User).count() > 0:
        return

    # 1. Users / Employees
    users = [
        User(id="1", code="EMP-001", name="Admin User", email="admin@taskmanagement.com", password="admin123", role="Admin", designation="Administrator", department="Executive", status="Active"),
        User(id="2", code="EMP-002", name="Sophia Chen", email="sophia@projectmatrix.com", password="password123", role="PM", designation="Senior Project Manager", department="Engineering", status="Active"),
        User(id="3", code="EMP-003", name="Ravi Kumar", email="ravi@projectmatrix.com", password="password123", role="Employee", designation="Full Stack Engineer", department="Engineering", status="Active"),
        User(id="4", code="EMP-004", name="Elena Rostova", email="elena@projectmatrix.com", password="password123", role="Team Lead", designation="Lead UI Engineer", department="Engineering", status="Active"),
        User(id="5", code="EMP-005", name="David Kim", email="david@projectmatrix.com", password="password123", role="Management", designation="Director of Engineering", department="Executive", status="Active")
    ]
    db.add_all(users)
    db.commit()

    # 2. Projects
    projects = [
        Project(id="PRJ-01", code="TMP-MVP", name="Task Management Portal MVP", description="Enterprise task allocation, workflow sections, and 3-tier portal hierarchy.", owner_id="2", status="Active", review_required=True, start_date="2026-10-01", end_date="2026-11-30"),
        Project(id="PRJ-02", code="CIU-2026", name="Cloud Infrastructure Upgrade", description="Automated CI/CD pipelines and multi-tenant security architecture.", owner_id="1", status="Active", review_required=False, start_date="2026-09-15", end_date="2026-12-15")
    ]
    db.add_all(projects)
    db.commit()

    # 3. Project Members
    members = [
        ProjectMember(id="MEM-01", project_id="PRJ-01", employee_id="1", role="Admin"),
        ProjectMember(id="MEM-02", project_id="PRJ-01", employee_id="2", role="PM"),
        ProjectMember(id="MEM-03", project_id="PRJ-01", employee_id="3", role="Developer"),
        ProjectMember(id="MEM-04", project_id="PRJ-01", employee_id="4", role="Lead"),
        ProjectMember(id="MEM-05", project_id="PRJ-02", employee_id="1", role="Admin"),
        ProjectMember(id="MEM-06", project_id="PRJ-02", employee_id="3", role="Developer")
    ]
    db.add_all(members)
    db.commit()

    # 4. Modules / Sections
    modules = [
        Module(id="MOD-01", project_id="PRJ-01", name="Authentication & Security", description="SSO, JWT, Role Permissions Matrix", sort_order=1),
        Module(id="MOD-02", project_id="PRJ-01", name="Kanban & Workflow Engine", description="Real-time card movements and state machine", sort_order=2),
        Module(id="MOD-03", project_id="PRJ-01", name="Analytics & Reporting", description="Capacity, productivity, and effort charts", sort_order=3),
        Module(id="MOD-04", project_id="PRJ-02", name="Terraform Provisioning", description="Infrastructure as code for AWS VPC", sort_order=1)
    ]
    db.add_all(modules)
    db.commit()

    # 5. Labels
    labels = [
        Label(id="LBL-01", name="Feature", color="#38bdf8", status="Active"),
        Label(id="LBL-02", name="Bug", color="#f87171", status="Active"),
        Label(id="LBL-03", name="Design", color="#c084fc", status="Active"),
        Label(id="LBL-04", name="Urgent", color="#fb923c", status="Active"),
        Label(id="LBL-05", name="Backend", color="#4ade80", status="Active")
    ]
    db.add_all(labels)
    db.commit()

    # 6. Tasks
    tasks = [
        Task(
            id="TSK-101",
            name="Design Database Schema & Entities",
            description="Structure models for users, projects, sections, tasks, subtasks, and labels.",
            project_id="PRJ-01",
            module_id="MOD-01",
            priority="High",
            status="In Progress",
            progress=60,
            assigned_to="3",
            reviewer_id="2",
            start_date="2026-10-02",
            end_date="2026-10-15",
            created_by="2"
        ),
        Task(
            id="TSK-102",
            name="Setup FastAPI Backend & Modular Routers",
            description="Implement contract-first FastAPI routes matching exact frontend payload schemas.",
            project_id="PRJ-01",
            module_id="MOD-01",
            priority="High",
            status="In Progress",
            progress=90,
            assigned_to="1",
            reviewer_id="2",
            start_date="2026-10-04",
            end_date="2026-10-12",
            created_by="1"
        ),
        Task(
            id="TSK-103",
            name="Build 3-Portal Navigation & Header",
            description="Implement Personal, Master, and Admin portal views with responsive sidebar.",
            project_id="PRJ-01",
            module_id="MOD-02",
            priority="Medium",
            status="Completed",
            progress=100,
            assigned_to="3",
            reviewer_id="2",
            start_date="2026-10-01",
            end_date="2026-10-08",
            completed_at=datetime.utcnow(),
            created_by="2"
        )
    ]
    db.add_all(tasks)
    db.commit()

    # 7. Subtasks
    subtasks = [
        Subtask(id="SUB-1", task_id="TSK-101", title="Define Project & Task Models", is_done=True, sort_order=1),
        Subtask(id="SUB-2", task_id="TSK-101", title="Add ForeignKey Relationships", is_done=True, sort_order=2),
        Subtask(id="SUB-3", task_id="TSK-101", title="Verify Migrations & Seed Data", is_done=False, sort_order=3),
        Subtask(id="SUB-4", task_id="TSK-102", title="Configure CORSMiddleware", is_done=True, sort_order=1),
        Subtask(id="SUB-5", task_id="TSK-102", title="Mount Admin, Master, Personal Routers", is_done=True, sort_order=2)
    ]
    db.add_all(subtasks)
    db.commit()

    # 8. Master Entities (Clients, Departments, Designations)
    masters = [
        Client(id="CLI-01", name="Acme Global Corporation", email="contact@acme.com", status="Active"),
        Client(id="CLI-02", name="Nexus FinTech Systems", email="info@nexusfin.io", status="Active"),
        Department(id="DEP-01", name="Engineering", status="Active"),
        Department(id="DEP-02", name="Product & Design", status="Active"),
        Department(id="DEP-03", name="Operations", status="Active"),
        Designation(id="DES-01", name="Lead Architect", status="Active"),
        Designation(id="DES-02", name="Senior Engineer", status="Active"),
        Designation(id="DES-03", name="Product Manager", status="Active")
    ]
    db.add_all(masters)
    db.commit()

