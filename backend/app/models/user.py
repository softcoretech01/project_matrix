# backend/app/models/user.py
from sqlalchemy import Column, String, Integer, DateTime, Boolean
from datetime import datetime
from app.db.base import Base

class User(Base):
    __tablename__ = "employees"

    id = Column(String(50), primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(50), default="Employee")  # Admin, PM, Team Lead, Employee, Management
    designation = Column(String(100), default="Engineer")
    department = Column(String(100), default="Engineering")
    status = Column(String(20), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)

