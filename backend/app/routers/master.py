# backend/app/routers/master.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from backend.app.db.database import get_db
from backend.app.models.models import Client, Department, Designation

router = APIRouter(prefix="/api/masters", tags=["Master Portal"])

class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    status: Optional[str] = "Active"

class DepartmentCreate(BaseModel):
    name: str
    status: Optional[str] = "Active"

class DesignationCreate(BaseModel):
    name: str
    status: Optional[str] = "Active"

# --- CLIENTS ---
@router.get("/clients")
def get_clients(db: Session = Depends(get_db)):
    return [c.to_dict() for c in db.query(Client).all()]

@router.post("/clients")
def create_client(client_in: ClientCreate, db: Session = Depends(get_db)):
    count = db.query(Client).count()
    new_id = f"CLI-{str(count + 1).zfill(2)}"
    client = Client(id=new_id, name=client_in.name, email=client_in.email, status=client_in.status or "Active")
    db.add(client)
    db.commit()
    db.refresh(client)
    return client.to_dict()

# --- DEPARTMENTS ---
@router.get("/departments")
def get_departments(db: Session = Depends(get_db)):
    return [d.to_dict() for d in db.query(Department).all()]

@router.post("/departments")
def create_department(dep_in: DepartmentCreate, db: Session = Depends(get_db)):
    count = db.query(Department).count()
    new_id = f"DEP-{str(count + 1).zfill(2)}"
    department = Department(id=new_id, name=dep_in.name, status=dep_in.status or "Active")
    db.add(department)
    db.commit()
    db.refresh(department)
    return department.to_dict()

# --- DESIGNATIONS ---
@router.get("/designations")
def get_designations(db: Session = Depends(get_db)):
    return [d.to_dict() for d in db.query(Designation).all()]

@router.post("/designations")
def create_designation(des_in: DesignationCreate, db: Session = Depends(get_db)):
    count = db.query(Designation).count()
    new_id = f"DES-{str(count + 1).zfill(2)}"
    designation = Designation(id=new_id, name=des_in.name, status=des_in.status or "Active")
    db.add(designation)
    db.commit()
    db.refresh(designation)
    return designation.to_dict()
