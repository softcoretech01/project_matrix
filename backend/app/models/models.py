from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Date, Numeric
from sqlalchemy.sql import func
from datetime import date
from app.db.database import Base

class Employee(Base):
    __tablename__ = "employees"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False, unique=True)
    role = Column(String(50), default="Member")
    designation = Column(String(100), default="Developer")
    status = Column(String(50), default="Active")

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(50), primary_key=True, index=True)
    code = Column(String(50), nullable=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    owner = Column(String(100), default="Admin User")
    status = Column(String(50), default="Active")
    reviewRequired = Column(Boolean, default=False)
    clientId = Column(String(50), nullable=True, default="C239570")
    pmId = Column(String(50), nullable=True, default="E006")
    startDate = Column(Date, nullable=True, default=date.today)
    endDate = Column(Date, nullable=True, default=date.today)
    estimatedHours = Column(Integer, default=0)
    budget = Column(Numeric(15, 2), default=0.0)
    billable = Column(Boolean, default=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

    @property
    def members(self):
        from app.db.database import SessionLocal
        db = SessionLocal()
        try:
            return db.query(ProjectMember).filter(ProjectMember.projectId == str(self.id)).all()
        finally:
            db.close()

    @property
    def sections(self):
        from app.db.database import SessionLocal
        db = SessionLocal()
        try:
            return db.query(ProjectSection).filter(ProjectSection.projectId == str(self.id)).order_by(ProjectSection.sortOrder).all()
        finally:
            db.close()

class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    projectId = Column(String(50), nullable=False)
    employeeName = Column(String(100), nullable=False)
    role = Column(String(50), default="Member")
    addedAt = Column(DateTime(timezone=True), server_default=func.now())

class ProjectSection(Base):
    __tablename__ = "project_sections"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    projectId = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    sortOrder = Column(Integer, default=0)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(50), primary_key=True, index=True)
    code = Column(String(50), nullable=True)
    title = Column(String(200), nullable=True)
    name = Column(String(150), nullable=True)
    description = Column(Text, nullable=True)
    project = Column(String(150), default="Core System")
    project_id = Column(Integer, nullable=True)
    projectId = Column(String(50), nullable=True)
    moduleId = Column(String(50), nullable=True)
    assignee = Column(String(100), default="Priya")
    assigned_to = Column(String(100), nullable=True)
    assignedTo = Column(String(50), nullable=True)
    reviewerId = Column(String(50), nullable=True)
    priority = Column(String(50), default="Medium") # Low, Medium, High
    status = Column(String(50), default="Open") # Open, In Progress, Completed, Review, Closed
    progress = Column(Integer, default=0)
    estimatedHours = Column(Integer, default=0)
    loggedHours = Column(Numeric(10, 2), default=0.0)
    dueDate = Column(String(50), nullable=True)
    startDate = Column(Date, nullable=True)
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    endDate = Column(Date, nullable=True)
    createdBy = Column(String(100), default="Priya")
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    completedAt = Column(DateTime(timezone=True), nullable=True)
    parentTaskId = Column(Integer, nullable=True)

    @property
    def subtasks(self):
        from app.db.database import SessionLocal
        db = SessionLocal()
        try:
            return db.query(Subtask).filter(Subtask.taskId == str(self.id)).order_by(Subtask.sortOrder).all()
        finally:
            db.close()

    @property
    def comments(self):
        from app.db.database import SessionLocal
        db = SessionLocal()
        try:
            return db.query(TaskComment).filter(TaskComment.taskId == str(self.id)).order_by(TaskComment.createdAt).all()
        finally:
            db.close()

class Subtask(Base):
    __tablename__ = "subtasks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    taskId = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    isDone = Column(Boolean, default=False)
    sortOrder = Column(Integer, default=0)

class TaskComment(Base):
    __tablename__ = "task_comments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    taskId = Column(String(50), nullable=False)
    author = Column(String(100), default="Priya")
    text = Column(Text, nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
