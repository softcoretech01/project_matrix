# backend/app/models/__init__.py
from app.db.base import Base
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.module import Module
from app.models.label import Label
from app.models.task import Task, Subtask, TaskComment, Notification
from app.models.master import Client, Department, Designation

__all__ = [
    "Base",
    "User",
    "Project",
    "ProjectMember",
    "Module",
    "Label",
    "Task",
    "Subtask",
    "TaskComment",
    "Notification",
    "Client",
    "Department",
    "Designation",
]
