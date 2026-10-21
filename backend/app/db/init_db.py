from backend.app.db.database import engine, Base, SessionLocal
from backend.app.models.models import User, Project, Section, Label, Task, Subtask, Comment, Notification

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if users already exist
        if db.query(User).count() == 0:
            users = [
                User(
                    id="1",
                    name="Admin User",
                    email="admin@taskmanagement.com",
                    password="admin123",
                    role="Admin",
                    designation="System Administrator",
                    status="Active"
                ),
                User(
                    id="2",
                    name="Project Manager",
                    email="pm@taskmanagement.com",
                    password="admin123",
                    role="PM",
                    designation="Lead Project Manager",
                    status="Active"
                ),
                User(
                    id="3",
                    name="Ravi Kumar",
                    email="ravi@taskmanagement.com",
                    password="admin123",
                    role="Team Lead",
                    designation="Senior Tech Lead",
                    status="Active"
                ),
                User(
                    id="4",
                    name="Anita Sharma",
                    email="anita@taskmanagement.com",
                    password="admin123",
                    role="Employee",
                    designation="Full Stack Engineer",
                    status="Active"
                ),
                User(
                    id="5",
                    name="Sachin Verma",
                    email="sachin@taskmanagement.com",
                    password="admin123",
                    role="Employee",
                    designation="UI/UX Designer",
                    status="Active"
                )
            ]
            db.add_all(users)

            projects = [
                Project(
                    id="PRJ-01",
                    name="Task Management Portal MVP",
                    description="Enterprise multi-portal task management system with Kanban and realtime flows.",
                    owner_id="1",
                    status="Active"
                ),
                Project(
                    id="PRJ-02",
                    name="Mobile App Redesign",
                    description="Next generation mobile workflow and dashboard experience.",
                    owner_id="2",
                    status="Active"
                )
            ]
            db.add_all(projects)

            sections = [
                Section(id="SEC-01", project_id="PRJ-01", name="Frontend Components", sort_order=1),
                Section(id="SEC-02", project_id="PRJ-01", name="Backend & Database APIs", sort_order=2),
                Section(id="SEC-03", project_id="PRJ-02", name="UI/UX Wireframes", sort_order=1),
                Section(id="SEC-04", project_id="PRJ-02", name="QA & Testing", sort_order=2)
            ]
            db.add_all(sections)

            labels = [
                Label(id="LBL-01", name="Bug", color="#ef4444"),
                Label(id="LBL-02", name="Feature", color="#3b82f6"),
                Label(id="LBL-03", name="High Priority", color="#f59e0b"),
                Label(id="LBL-04", name="Design", color="#8b5cf6")
            ]
            db.add_all(labels)

            tasks = [
                Task(
                    id="TSK-101",
                    name="Design Database Schema & Models",
                    description="Define SQLite/SQLAlchemy schema for users, tasks, projects, sections, comments, and subtasks.",
                    project_id="PRJ-01",
                    section_id="SEC-02",
                    priority="High",
                    status="In Progress",
                    progress=60,
                    assigned_to="1",
                    reviewer_id="2",
                    start_date="2026-10-01",
                    end_date="2026-10-25",
                    label="Feature"
                ),
                Task(
                    id="TSK-102",
                    name="Setup FastAPI Backend & Routers",
                    description="Implement RESTful modular routers for auth, tasks, projects, employees, and notifications.",
                    project_id="PRJ-01",
                    section_id="SEC-02",
                    priority="High",
                    status="Completed",
                    progress=100,
                    assigned_to="1",
                    reviewer_id="2",
                    start_date="2026-10-01",
                    end_date="2026-10-15",
                    label="Feature"
                ),
                Task(
                    id="TSK-103",
                    name="Build Kanban Drag and Drop View",
                    description="Integrate interactive kanban board with column dropping and live progress calculation.",
                    project_id="PRJ-01",
                    section_id="SEC-01",
                    priority="Medium",
                    status="In Progress",
                    progress=45,
                    assigned_to="3",
                    reviewer_id="2",
                    start_date="2026-10-10",
                    end_date="2026-10-28",
                    label="UI/UX"
                ),
                Task(
                    id="TSK-104",
                    name="Mobile UI Dark Mode Consistency Testing",
                    description="Verify color contrast, theme variables, and responsive layout across mobile viewports.",
                    project_id="PRJ-02",
                    section_id="SEC-03",
                    priority="Low",
                    status="Open",
                    progress=0,
                    assigned_to="5",
                    reviewer_id="3",
                    start_date="2026-10-15",
                    end_date="2026-11-05",
                    label="Design"
                ),
                Task(
                    id="TSK-105",
                    name="Security & Role Access Review",
                    description="Verify that Admin, PM, Team Lead, and Employee roles receive appropriate API responses.",
                    project_id="PRJ-01",
                    section_id="SEC-02",
                    priority="Critical",
                    status="Review",
                    progress=90,
                    assigned_to="2",
                    reviewer_id="1",
                    start_date="2026-10-12",
                    end_date="2026-10-30",
                    label="High Priority"
                )
            ]
            db.add_all(tasks)

            subtasks = [
                Subtask(task_id="TSK-101", title="Define User and Project entities", is_done=True),
                Subtask(task_id="TSK-101", title="Define Task and Subtask tables", is_done=True),
                Subtask(task_id="TSK-101", title="Configure foreign key relationships", is_done=False),
                Subtask(task_id="TSK-103", title="Implement HTML5 drag and drop handlers", is_done=True),
                Subtask(task_id="TSK-103", title="Add backend status update synchronization", is_done=False)
            ]
            db.add_all(subtasks)

            comments = [
                Comment(
                    task_id="TSK-101",
                    user_id="1",
                    user_name="Admin User",
                    text="Initial SQLite database configured. Tables created cleanly."
                ),
                Comment(
                    task_id="TSK-103",
                    user_id="3",
                    user_name="Ravi Kumar",
                    text="Kanban columns updated with CSS gradients and hover effects."
                )
            ]
            db.add_all(comments)

            notifications = [
                Notification(
                    user_id="1",
                    title="Task Assigned",
                    message="You were assigned to 'Design Database Schema & Models'.",
                    is_read=False
                ),
                Notification(
                    user_id="1",
                    title="System Deployment",
                    message="FastAPI backend v2.0 initialized with full persistence.",
                    is_read=False
                )
            ]
            db.add_all(notifications)

            db.commit()
    finally:
        db.close()

