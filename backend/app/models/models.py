from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True, index=True)
    code = Column(String(50), nullable=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(100), nullable=False)
    role = Column(String(50), default="Employee")  # Admin, PM, Team Lead, Employee
    designation = Column(String(100), default="Engineer")
    department = Column(String(100), default="Engineering")
    status = Column(String(20), default="Active")  # Active, Inactive
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code or f"EMP-{str(self.id).zfill(3)}",
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "designation": self.designation,
            "department": self.department or "Engineering",
            "status": self.status,
            "token": f"token-{self.id}"
        }

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(50), primary_key=True, index=True)
    code = Column(String(50), nullable=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(String(50), nullable=True)
    status = Column(String(20), default="Active")  # Active, Inactive, Completed
    review_required = Column(Boolean, default=True)
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code or self.id,
            "name": self.name,
            "description": self.description or "",
            "ownerId": self.owner_id or "",
            "status": self.status,
            "reviewRequired": self.review_required if self.review_required is not None else True,
            "startDate": self.start_date or "",
            "endDate": self.end_date or ""
        }

class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(String(50), primary_key=True, index=True)
    project_id = Column(String(50), nullable=False, index=True)
    employee_id = Column(String(50), nullable=False)
    role = Column(String(50), default="Member")

    def to_dict(self):
        return {
            "id": self.id,
            "projectId": self.project_id,
            "employeeId": self.employee_id,
            "role": self.role
        }

class Section(Base):
    __tablename__ = "sections"

    id = Column(String(50), primary_key=True, index=True)
    project_id = Column(String(50), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    sort_order = Column(Integer, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "projectId": self.project_id,
            "name": self.name,
            "sortOrder": self.sort_order
        }

class Label(Base):
    __tablename__ = "labels"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    color = Column(String(30), default="#6366f1")
    status = Column(String(20), default="Active")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "color": self.color,
            "status": self.status or "Active"
        }

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    project_id = Column(String(50), nullable=True, index=True)
    section_id = Column(String(50), nullable=True)
    module_id = Column(String(50), nullable=True)
    priority = Column(String(20), default="Medium")  # Low, Medium, High, Critical
    status = Column(String(20), default="Open")  # Open, In Progress, Review, Completed
    progress = Column(Integer, default=0)
    assigned_to = Column(String(50), nullable=True)
    reviewer_id = Column(String(50), nullable=True)
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    label = Column(String(50), nullable=True)
    parent_task_id = Column(String(50), nullable=True)
    created_by = Column(String(50), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description or "",
            "projectId": self.project_id or "",
            "sectionId": self.section_id or self.module_id or "",
            "moduleId": self.module_id or self.section_id or "",
            "priority": self.priority or "Medium",
            "status": self.status or "Open",
            "progress": self.progress if self.progress is not None else 0,
            "assignedTo": self.assigned_to or "",
            "reviewerId": self.reviewer_id or "",
            "startDate": self.start_date or "",
            "endDate": self.end_date or "",
            "label": self.label or "",
            "parentTaskId": self.parent_task_id or "",
            "completedAt": self.completed_at.isoformat() if self.completed_at else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }

class Subtask(Base):
    __tablename__ = "subtasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(50), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    is_done = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "taskId": self.task_id,
            "title": self.title,
            "isDone": self.is_done,
            "sortOrder": self.sort_order
        }

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(50), nullable=False, index=True)
    user_id = Column(String(50), nullable=False)
    user_name = Column(String(100), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "taskId": self.task_id,
            "userId": self.user_id,
            "userName": self.user_name,
            "text": self.text,
            "createdAt": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else ""
        }

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), nullable=True)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id or "",
            "title": self.title,
            "message": self.message,
            "isRead": self.is_read,
            "createdAt": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else ""
        }

class Client(Base):
    __tablename__ = "clients"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(100), nullable=True)
    status = Column(String(20), default="Active")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email or "",
            "status": self.status or "Active"
        }

class Department(Base):
    __tablename__ = "departments"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    status = Column(String(20), default="Active")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status or "Active"
        }

class Designation(Base):
    __tablename__ = "designations"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    status = Column(String(20), default="Active")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status or "Active"
        }

class Module(Base):
    __tablename__ = "modules"

    id = Column(String(50), primary_key=True, index=True)
    project_id = Column(String(50), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    description = Column(String(500), nullable=True)
    sort_order = Column(Integer, default=1)

    def to_dict(self):
        return {
            "id": self.id,
            "projectId": self.project_id,
            "name": self.name,
            "description": self.description or "",
            "sortOrder": self.sort_order
        }
