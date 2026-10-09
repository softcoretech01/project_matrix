# backend/app/schemas/task.py
from pydantic import BaseModel
from typing import Optional, List

class SubtaskItem(BaseModel):
    id: Optional[str] = None
    title: str
    isDone: Optional[bool] = False
    sortOrder: Optional[int] = 1

class CommentItem(BaseModel):
    id: Optional[str] = None
    authorId: str
    authorName: Optional[str] = None
    text: str
    createdAt: Optional[str] = None

class TaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    projectId: Optional[str] = None
    moduleId: Optional[str] = None
    priority: Optional[str] = "Medium"
    status: Optional[str] = "Open"
    progress: Optional[int] = 0
    assignedTo: Optional[str] = None
    reviewerId: Optional[str] = None
    parentTaskId: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    projectId: Optional[str] = None
    moduleId: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    assignedTo: Optional[str] = None
    reviewerId: Optional[str] = None
    parentTaskId: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None

class TaskOut(TaskBase):
    id: str
    completedAt: Optional[str] = None
    createdAt: Optional[str] = None
    subtasks: Optional[List[SubtaskItem]] = []

    class Config:
        from_attributes = True

