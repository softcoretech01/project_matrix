# backend/app/models/task.py
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey
from datetime import datetime
from app.db.base import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(String(1000), nullable=True)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    module_id = Column(String(50), ForeignKey("modules.id", ondelete="SET NULL"), nullable=True)
    priority = Column(String(30), default="Medium")
    status = Column(String(30), default="Open")
    progress = Column(Integer, default=0)
    assigned_to = Column(String(50), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    reviewer_id = Column(String(50), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    parent_task_id = Column(String(50), nullable=True)
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_by = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Subtask(Base):
    __tablename__ = "subtasks"

    id = Column(String(50), primary_key=True, index=True)
    task_id = Column(String(50), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    is_done = Column(Boolean, default=False)
    sort_order = Column(Integer, default=1)

class TaskComment(Base):
    __tablename__ = "task_comments"

    id = Column(String(50), primary_key=True, index=True)
    task_id = Column(String(50), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(String(50), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    text = Column(String(1000), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), default="info")
    message = Column(String(500), nullable=False)
    task_id = Column(String(50), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

