# backend/app/models/label.py
from sqlalchemy import Column, String
from app.db.base import Base

class Label(Base):
    __tablename__ = "labels"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    color = Column(String(50), default="#38bdf8")
    status = Column(String(20), default="Active")

