# backend/app/models/project.py
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from datetime import datetime
from app.db.base import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(50), primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=True)
    name = Column(String(150), nullable=False)
    description = Column(String(500), nullable=True)
    owner_id = Column(String(50), ForeignKey("employees.id"), nullable=True)
    status = Column(String(30), default="Active")
    review_required = Column(Boolean, default=True)
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(String(50), primary_key=True, index=True)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(50), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), default="Member")
    added_at = Column(DateTime, default=datetime.utcnow)

