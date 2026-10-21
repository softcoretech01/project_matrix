import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from backend.app.db.init_db import init_db
from backend.app.routers import (
    auth,
    tasks,
    projects,
    sections,
    labels,
    employees,
    notifications,
    search
)

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB & Seed Sample Data
    init_db()
    yield

app = FastAPI(title="Task Management API", lifespan=lifespan)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(projects.router)
app.include_router(sections.router)
app.include_router(labels.router)
app.include_router(employees.router)
app.include_router(notifications.router)
app.include_router(search.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Task Management API", "status": "online"}
