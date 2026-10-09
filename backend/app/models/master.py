# backend/app/models/master.py
from sqlalchemy import Column, String
from app.db.base import Base

class Client(Base):
    __tablename__ = "clients"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(100), nullable=True)
    status = Column(String(20), default="Active")

class Department(Base):
    __tablename__ = "departments"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    status = Column(String(20), default="Active")

class Designation(Base):
    __tablename__ = "designations"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    status = Column(String(20), default="Active")

