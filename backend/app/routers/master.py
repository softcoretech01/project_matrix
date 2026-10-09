# backend/app/routers/master.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.master import Client, Department, Designation
from app.schemas.master import ClientCreate, ClientOut, DepartmentCreate, DepartmentOut, DesignationCreate, DesignationOut

router = APIRouter(prefix="/masters", tags=["Master Portal"])

# --- CLIENTS ---
@router.get("/clients", response_model=List[ClientOut])
def get_clients(db: Session = Depends(get_db)):
    return db.query(Client).all()

@router.post("/clients", response_model=ClientOut)
def create_client(client_in: ClientCreate, db: Session = Depends(get_db)):
    count = db.query(Client).count()
    new_id = f"CLI-{str(count + 1).zfill(2)}"
    client = Client(id=new_id, name=client_in.name, email=client_in.email, status=client_in.status or "Active")
    db.add(client)
    db.commit()
    db.refresh(client)
    return client

# --- DEPARTMENTS ---
@router.get("/departments", response_model=List[DepartmentOut])
def get_departments(db: Session = Depends(get_db)):
    return db.query(Department).all()

@router.post("/departments", response_model=DepartmentOut)
def create_department(dep_in: DepartmentCreate, db: Session = Depends(get_db)):
    count = db.query(Department).count()
    new_id = f"DEP-{str(count + 1).zfill(2)}"
    department = Department(id=new_id, name=dep_in.name, status=dep_in.status or "Active")
    db.add(department)
    db.commit()
    db.refresh(department)
    return department

# --- DESIGNATIONS ---
@router.get("/designations", response_model=List[DesignationOut])
def get_designations(db: Session = Depends(get_db)):
    return db.query(Designation).all()

@router.post("/designations", response_model=DesignationOut)
def create_designation(des_in: DesignationCreate, db: Session = Depends(get_db)):
    count = db.query(Designation).count()
    new_id = f"DES-{str(count + 1).zfill(2)}"
    designation = Designation(id=new_id, name=des_in.name, status=des_in.status or "Active")
    db.add(designation)
    db.commit()
    db.refresh(designation)
    return designation

