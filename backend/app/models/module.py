# backend/app/models/module.py
from sqlalchemy import Column, String, Integer, ForeignKey
from app.db.base import Base

class Module(Base):
    __tablename__ = "modules"

    id = Column(String(50), primary_key=True, index=True)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(String(500), nullable=True)
    sort_order = Column(Integer, default=1)

