import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Adjust path if .env is at the root of the project
load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

app = FastAPI(title="Task Management API")

# Add CORS Middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/auth/login")
def login(req: LoginRequest):
    # Mock authentication
    if req.email == "admin@taskmanagement.com" and req.password == "admin123":
        return {
            "id": "1",
            "name": "Admin User",
            "email": req.email,
            "role": "Admin",
            "designation": "Administrator"
        }
    raise HTTPException(status_code=401, detail="Invalid email or password")

@app.get("/api/tasks")
def get_tasks():
    return [
        {
            "id": "TSK-101",
            "name": "Design Database Schema",
            "priority": "High",
            "status": "In Progress",
            "progress": 50,
            "assignedTo": "1",
            "endDate": "2026-10-15"
        },
        {
            "id": "TSK-102",
            "name": "Setup FastAPI Backend",
            "priority": "Medium",
            "status": "Completed",
            "progress": 100,
            "assignedTo": "1",
            "endDate": "2026-10-10"
        }
    ]

@app.get("/api/projects")
def get_projects():
    return [
        {
            "id": "PRJ-01",
            "name": "Task Management Portal MVP",
            "status": "Active"
        }
    ]

@app.get("/api/employees")
def get_employees():
    return [
        {
            "id": "1",
            "name": "Admin User",
            "email": "admin@taskmanagement.com",
            "role": "Admin",
            "designation": "Administrator"
        }
    ]

@app.get("/")
def read_root():
    return {"message": "Welcome to Task Management API"}
