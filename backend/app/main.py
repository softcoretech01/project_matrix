# backend/app/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.db.seed import seed_database

# Routers
from app.routers import auth, employees, projects, modules, tasks, labels, admin, master, personal, reports

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize SQLite / Database tables
    Base.metadata.create_all(bind=engine)
    # 2. Seed initial default demo data
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title="ProjectMatrix Task Management API",
    version="2.5.0",
    description="FastAPI Backend for Personal, Master, and Admin Portals",
    lifespan=lifespan
)

# Configure CORS Middleware for complete frontend compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers under /api prefix (Contract-first matching)
app.include_router(auth.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(modules.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(labels.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(master.router, prefix="/api")
app.include_router(personal.router, prefix="/api")
app.include_router(reports.router, prefix="/api")

# Also mount under root without /api for direct route access
app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(projects.router)
app.include_router(modules.router)
app.include_router(tasks.router)
app.include_router(labels.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "ProjectMatrix Task Management Backend",
        "portals": ["Personal", "Master", "Admin"],
        "docs": "/docs"
    }
