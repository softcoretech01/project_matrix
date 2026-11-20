"""Create all tables and seed initial data (idempotent).

Roles: Admin / Master / Worker.
Seeds 1 Admin, 1 Master, 3 Workers + sample projects/tasks/timesheets so the
dashboard, calendar and reports have live data to show.
"""
import os
from datetime import datetime

from sqlalchemy import text, inspect

from backend.app.db.database import engine, Base, SessionLocal
from backend.app.core.security import get_password_hash
from backend.app.models.models import (
    Role, User, Project, ProjectMember, Section, Module, Label,
    Task, Subtask, Comment, Timesheet, Notification,
    Client, Department, Designation,
)

UPLOAD_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "uploads")


def _ensure_upload_dirs():
    for sub in ("timesheets", "tasks", "projects", "camera"):
        os.makedirs(os.path.join(UPLOAD_ROOT, sub), exist_ok=True)


def _run_lightweight_migrations():
    """Idempotent ADD COLUMNs for tables that were created before a column existed.
    create_all() never alters existing tables, so new nullable columns are added here."""
    adds = [
        ("pm_timesheet_attachments", "original_name", "VARCHAR(255) NULL"),
        ("pm_task_attachments", "original_name", "VARCHAR(255) NULL"),
    ]
    insp = inspect(engine)
    existing_tables = set(insp.get_table_names())
    with engine.begin() as conn:
        for table, col, coldef in adds:
            if table not in existing_tables:
                continue
            cols = {c["name"] for c in insp.get_columns(table)}
            if col not in cols:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {coldef}"))


def init_db():
    Base.metadata.create_all(bind=engine)
    _run_lightweight_migrations()
    _ensure_upload_dirs()

    db = SessionLocal()
    try:
        # ---- Roles ----
        if db.query(Role).count() == 0:
            db.add_all([
                Role(name="Admin", description="Full application access"),
                Role(name="Master", description="Operational oversight and monitoring"),
                Role(name="Worker", description="Assigned work, timesheets, personal performance"),
            ])
            db.commit()
        roles = {r.name: r.id for r in db.query(Role).all()}

        # ---- Users ----
        if db.query(User).count() == 0:
            users = [
                User(id="U-ADMIN", code="EMP-001", name="System Administrator",
                     email="admin@taskmanagement.com", password=get_password_hash("admin123"),
                     role="Admin", role_id=roles["Admin"], designation="System Administrator",
                     department="Management", status="Active"),
                User(id="U-MASTER", code="EMP-002", name="Priya Menon",
                     email="master@taskmanagement.com", password=get_password_hash("master123"),
                     role="Master", role_id=roles["Master"], designation="Operations Manager",
                     department="Management", status="Active"),
                User(id="U-W1", code="EMP-003", name="Ravi Kumar",
                     email="ravi@taskmanagement.com", password=get_password_hash("worker123"),
                     role="Worker", role_id=roles["Worker"], designation="Senior Engineer",
                     department="Engineering", status="Active"),
                User(id="U-W2", code="EMP-004", name="Anita Sharma",
                     email="anita@taskmanagement.com", password=get_password_hash("worker123"),
                     role="Worker", role_id=roles["Worker"], designation="Full Stack Engineer",
                     department="Engineering", status="Active"),
                User(id="U-W3", code="EMP-005", name="Sachin Verma",
                     email="sachin@taskmanagement.com", password=get_password_hash("worker123"),
                     role="Worker", role_id=roles["Worker"], designation="UI/UX Designer",
                     department="Design", status="Active"),
            ]
            db.add_all(users)
            db.commit()

        # ---- Masters data ----
        if db.query(Client).count() == 0:
            db.add_all([
                Client(id="CLI-01", name="Acme Corp", email="contact@acme.com", status="Active"),
                Client(id="CLI-02", name="Global Industries", email="info@global.com", status="Active"),
            ])
        if db.query(Department).count() == 0:
            db.add_all([
                Department(id="DEP-01", name="Engineering", status="Active"),
                Department(id="DEP-02", name="Design", status="Active"),
                Department(id="DEP-03", name="Management", status="Active"),
            ])
        if db.query(Designation).count() == 0:
            db.add_all([
                Designation(id="DSG-01", name="System Administrator", status="Active"),
                Designation(id="DSG-02", name="Operations Manager", status="Active"),
                Designation(id="DSG-03", name="Senior Engineer", status="Active"),
                Designation(id="DSG-04", name="Full Stack Engineer", status="Active"),
                Designation(id="DSG-05", name="UI/UX Designer", status="Active"),
            ])
        if db.query(Label).count() == 0:
            db.add_all([
                Label(id="LBL-01", name="Bug", color="#ef4444"),
                Label(id="LBL-02", name="Feature", color="#3b82f6"),
                Label(id="LBL-03", name="High Priority", color="#f59e0b"),
                Label(id="LBL-04", name="Design", color="#8b5cf6"),
                Label(id="LBL-05", name="Documentation", color="#10b981"),
            ])
        db.commit()

        # ---- Projects ---- (sample business data disabled: app runs on live data only)
        if False:
            db.add_all([
                Project(id="PRJ-01", code="PRJ-01", name="Customer Portal Revamp",
                        description="Rebuild the customer-facing portal with a modern SaaS UI and secure APIs.",
                        owner_id="U-MASTER", priority="High", status="In Progress", progress=45,
                        review_required=True, start_date="2026-11-01", end_date="2026-12-20"),
                Project(id="PRJ-02", code="PRJ-02", name="Mobile App Redesign",
                        description="Next generation mobile workflow and dashboard experience.",
                        owner_id="U-MASTER", priority="Medium", status="In Progress", progress=25,
                        review_required=True, start_date="2026-11-05", end_date="2027-01-15"),
                Project(id="PRJ-03", code="PRJ-03", name="Internal Analytics Platform",
                        description="Centralized analytics and performance reporting for operations.",
                        owner_id="U-ADMIN", priority="Medium", status="Not Started", progress=0,
                        review_required=False, start_date="2026-12-01", end_date="2027-02-28"),
            ])
            db.commit()  # projects must exist before FK children
            db.add_all([
                ProjectMember(id="MEM-01", project_id="PRJ-01", employee_id="U-W1", role="Developer"),
                ProjectMember(id="MEM-02", project_id="PRJ-01", employee_id="U-W2", role="Developer"),
                ProjectMember(id="MEM-03", project_id="PRJ-02", employee_id="U-W3", role="Designer"),
                ProjectMember(id="MEM-04", project_id="PRJ-02", employee_id="U-W2", role="Developer"),
            ])
            db.add_all([
                Section(id="SEC-01", project_id="PRJ-01", name="Frontend", sort_order=1),
                Section(id="SEC-02", project_id="PRJ-01", name="Backend & APIs", sort_order=2),
                Section(id="SEC-03", project_id="PRJ-02", name="Wireframes", sort_order=1),
            ])
            db.add_all([
                Module(id="MOD-01", project_id="PRJ-01", name="Frontend Core", sort_order=1),
                Module(id="MOD-02", project_id="PRJ-01", name="Backend API", sort_order=2),
            ])
            db.commit()

        # ---- Tasks ---- (sample data disabled)
        if False:
            tasks = [
                Task(id="TSK-1001", code="TSK-1001", name="Design database schema",
                     description="Define SQLAlchemy models, relationships and migrations.",
                     project_id="PRJ-01", section_id="SEC-02", module_id="MOD-02",
                     priority="High", status="In Progress", progress=40,
                     assigned_to="U-W1", reviewer_id="U-MASTER",
                     start_date="2026-11-10", end_date="2026-11-25", estimated_hours=24, label="Feature",
                     created_by="U-MASTER"),
                Task(id="TSK-1002", code="TSK-1002", name="Build authentication service",
                     description="JWT auth, bcrypt hashing and RBAC across all portals.",
                     project_id="PRJ-01", section_id="SEC-02", module_id="MOD-02",
                     priority="High", status="Completed", progress=100,
                     assigned_to="U-W2", reviewer_id="U-MASTER",
                     start_date="2026-11-01", end_date="2026-11-15", estimated_hours=20, label="Feature",
                     created_by="U-MASTER", completed_at=datetime(2026, 11, 14, 16, 30)),
                Task(id="TSK-1003", code="TSK-1003", name="Create dashboard layout",
                     description="Grid-based dashboard with KPI cards and charts.",
                     project_id="PRJ-01", section_id="SEC-01", module_id="MOD-01",
                     priority="Medium", status="To Do", progress=0,
                     assigned_to="U-W1", reviewer_id="U-MASTER",
                     start_date="2026-11-20", end_date="2026-11-20", estimated_hours=16, label="Feature",
                     created_by="U-MASTER"),
                Task(id="TSK-1004", code="TSK-1004", name="Mobile wireframes",
                     description="High-fidelity wireframes for the mobile redesign.",
                     project_id="PRJ-02", section_id="SEC-03",
                     priority="High", status="In Progress", progress=55,
                     assigned_to="U-W3", reviewer_id="U-MASTER",
                     start_date="2026-11-05", end_date="2026-11-12", estimated_hours=30, label="Design",
                     created_by="U-MASTER"),  # overdue (due in the past, not completed)
                Task(id="TSK-1005", code="TSK-1005", name="API integration tests",
                     description="End-to-end tests for all portal endpoints.",
                     project_id="PRJ-01", section_id="SEC-02",
                     priority="Medium", status="Pending", progress=10,
                     assigned_to="U-W2", reviewer_id="U-MASTER",
                     start_date="2026-11-18", end_date="2026-12-05", estimated_hours=18, label="Documentation",
                     created_by="U-MASTER"),
                Task(id="TSK-1006", code="TSK-1006", name="Design component library",
                     description="Reusable UI components and style tokens.",
                     project_id="PRJ-02", section_id="SEC-03",
                     priority="Low", status="To Do", progress=0,
                     assigned_to="U-W3", reviewer_id="U-MASTER",
                     start_date="2026-11-22", end_date="2026-11-28", estimated_hours=12, label="Design",
                     created_by="U-MASTER"),
            ]
            db.add_all(tasks)
            db.commit()  # tasks must exist before subtasks/comments FK children
            db.add_all([
                Subtask(task_id="TSK-1001", title="Define User and Role entities", is_done=True, sort_order=1),
                Subtask(task_id="TSK-1001", title="Add Timesheet and Attachment tables", is_done=True, sort_order=2),
                Subtask(task_id="TSK-1001", title="Wire foreign-key relationships", is_done=False, sort_order=3),
                Subtask(task_id="TSK-1004", title="Low-fidelity flows", is_done=True, sort_order=1),
                Subtask(task_id="TSK-1004", title="High-fidelity screens", is_done=False, sort_order=2),
            ])
            db.add_all([
                Comment(task_id="TSK-1001", user_id="U-MASTER", user_name="Priya Menon",
                        text="Please keep the relationships normalized."),
                Comment(task_id="TSK-1004", user_id="U-W3", user_name="Sachin Verma",
                        text="First draft of the flows is ready for review."),
            ])
            db.commit()

        # ---- Timesheets ---- (sample data disabled)
        if False:
            db.add_all([
                Timesheet(id="TS-0001", code="TS-0001", user_id="U-W1", project_id="PRJ-01",
                          task_id="TSK-1001", work_date="2026-11-18", from_time="09:00 AM",
                          to_time="01:00 PM", total_hours=4.0, status="Submitted",
                          remarks="Worked on the schema design and relationship mapping."),
                Timesheet(id="TS-0002", code="TS-0002", user_id="U-W2", project_id="PRJ-01",
                          task_id="TSK-1002", work_date="2026-11-14", from_time="10:00 AM",
                          to_time="05:30 PM", total_hours=7.5, status="Approved",
                          remarks="Completed JWT auth and RBAC wiring."),
            ])
            db.commit()

        # ---- Notifications ---- (sample data disabled)
        if False:
            db.add_all([
                Notification(user_id="U-W1", type="task", title="Task Assigned",
                             message="You were assigned 'Design database schema'.",
                             task_id="TSK-1001", is_read=False),
                Notification(user_id=None, type="system", title="System Ready",
                             message="ProjectMatrix backend initialized with full persistence.",
                             is_read=False),
            ])
            db.commit()
    finally:
        db.close()
