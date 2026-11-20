"""
Single source of truth for all ORM models (ProjectMatrix Task Management System).
All tables are namespaced with the `pm_` prefix so the app is isolated from any
other tables that may live in the same (shared) database.

Three roles only: Admin / Master / Worker.
"""
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Text, Boolean, DateTime, Float, ForeignKey
)
from sqlalchemy.orm import relationship
from backend.app.db.database import Base


import json as _json


def _dt(value):
    return value.isoformat() if value else None


def _loadjson(value):
    if not value:
        return {}
    try:
        return _json.loads(value)
    except Exception:
        return {}


# --------------------------------------------------------------------------- #
#  Roles & Users
# --------------------------------------------------------------------------- #
class Role(Base):
    __tablename__ = "pm_roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)   # Admin / Master / Worker
    description = Column(String(255))

    users = relationship("User", back_populates="role_obj")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "description": self.description or ""}


class User(Base):
    __tablename__ = "pm_users"

    id = Column(String(50), primary_key=True)
    code = Column(String(50))
    name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)           # bcrypt hash
    role = Column(String(50), default="Worker", index=True)  # operational role
    role_id = Column(Integer, ForeignKey("pm_roles.id"))
    designation = Column(String(150))
    department = Column(String(150))
    phone = Column(String(50))
    avatar = Column(String(255))
    status = Column(String(30), default="Active")
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    role_obj = relationship("Role", back_populates="users")

    def to_dict(self, include_sensitive=False):
        d = {
            "id": self.id,
            "code": self.code or f"EMP-{str(self.id).zfill(3)}",
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "roleId": self.role_id,
            "designation": self.designation or "",
            "department": self.department or "",
            "phone": self.phone or "",
            "avatar": self.avatar or "",
            "status": self.status or "Active",
            "lastLogin": _dt(self.last_login),
            "createdAt": _dt(self.created_at),
        }
        return d


# --------------------------------------------------------------------------- #
#  Projects
# --------------------------------------------------------------------------- #
class Project(Base):
    __tablename__ = "pm_projects"

    id = Column(String(50), primary_key=True)
    code = Column(String(50))
    name = Column(String(200), nullable=False)
    description = Column(Text)
    owner_id = Column(String(50), ForeignKey("pm_users.id"))
    priority = Column(String(20), default="Medium")
    status = Column(String(30), default="Not Started")
    progress = Column(Integer, default=0)
    review_required = Column(Boolean, default=True)
    start_date = Column(String(20))
    end_date = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", foreign_keys=[owner_id])
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    attachments = relationship("ProjectAttachment", back_populates="project", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code or self.id,
            "name": self.name,
            "description": self.description or "",
            "ownerId": self.owner_id or "",
            "ownerName": self.owner.name if self.owner else "",
            "priority": self.priority or "Medium",
            "status": self.status or "Not Started",
            "progress": self.progress if self.progress is not None else 0,
            "reviewRequired": self.review_required if self.review_required is not None else True,
            "startDate": self.start_date or "",
            "endDate": self.end_date or "",
            "createdAt": _dt(self.created_at),
        }


class ProjectMember(Base):
    __tablename__ = "pm_project_members"

    id = Column(String(50), primary_key=True)
    project_id = Column(String(50), ForeignKey("pm_projects.id", ondelete="CASCADE"))
    employee_id = Column(String(50), ForeignKey("pm_users.id", ondelete="CASCADE"))
    role = Column(String(50))

    project = relationship("Project", back_populates="members")
    employee = relationship("User", foreign_keys=[employee_id])

    def to_dict(self):
        return {
            "id": self.id,
            "projectId": self.project_id,
            "employeeId": self.employee_id,
            "employeeName": self.employee.name if self.employee else "",
            "role": self.role,
        }


class ProjectAttachment(Base):
    __tablename__ = "pm_project_attachments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String(50), ForeignKey("pm_projects.id", ondelete="CASCADE"))
    filename = Column(String(255))
    filepath = Column(String(500))
    uploaded_by = Column(String(50), ForeignKey("pm_users.id"))
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="attachments")

    def to_dict(self):
        return {
            "id": self.id,
            "projectId": self.project_id,
            "filename": self.filename,
            "url": f"/uploads/projects/{self.filename}",
            "uploadedBy": self.uploaded_by,
            "uploadedAt": _dt(self.uploaded_at),
        }


class Section(Base):
    __tablename__ = "pm_sections"

    id = Column(String(50), primary_key=True)
    project_id = Column(String(50), ForeignKey("pm_projects.id", ondelete="CASCADE"))
    name = Column(String(150), nullable=False)
    sort_order = Column(Integer, default=0)

    def to_dict(self):
        return {"id": self.id, "projectId": self.project_id, "name": self.name, "sortOrder": self.sort_order}


class Module(Base):
    __tablename__ = "pm_modules"

    id = Column(String(50), primary_key=True)
    project_id = Column(String(50), ForeignKey("pm_projects.id", ondelete="CASCADE"))
    name = Column(String(150), nullable=False)
    description = Column(Text)
    sort_order = Column(Integer, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "projectId": self.project_id,
            "name": self.name,
            "description": self.description or "",
            "sortOrder": self.sort_order,
        }


class Label(Base):
    __tablename__ = "pm_labels"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    color = Column(String(20))
    status = Column(String(30), default="Active")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "color": self.color, "status": self.status or "Active"}


# --------------------------------------------------------------------------- #
#  Tasks
# --------------------------------------------------------------------------- #
class Task(Base):
    __tablename__ = "pm_tasks"

    id = Column(String(50), primary_key=True)
    code = Column(String(50))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    project_id = Column(String(50), ForeignKey("pm_projects.id", ondelete="SET NULL"))
    section_id = Column(String(50), ForeignKey("pm_sections.id", ondelete="SET NULL"))
    module_id = Column(String(50), ForeignKey("pm_modules.id", ondelete="SET NULL"))
    priority = Column(String(20), default="Medium")
    status = Column(String(30), default="To Do")
    progress = Column(Integer, default=0)
    assigned_to = Column(String(50), ForeignKey("pm_users.id", ondelete="SET NULL"))
    reviewer_id = Column(String(50), ForeignKey("pm_users.id", ondelete="SET NULL"))
    start_date = Column(String(20))
    end_date = Column(String(20))
    estimated_hours = Column(Float)
    label = Column(String(100))
    category = Column(String(40), default="general")   # work category key
    custom_data = Column(Text)                          # JSON of category-specific field values
    parent_task_id = Column(String(50))
    created_by = Column(String(50))
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", foreign_keys=[project_id])
    assignee = relationship("User", foreign_keys=[assigned_to])
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    subtasks = relationship("Subtask", back_populates="task", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="task", cascade="all, delete-orphan")
    updates = relationship("TaskUpdate", back_populates="task", cascade="all, delete-orphan")
    attachments = relationship("TaskAttachment", back_populates="task", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code or self.id,
            "name": self.name,
            "description": self.description or "",
            "projectId": self.project_id or "",
            "projectName": self.project.name if self.project else "",
            "sectionId": self.section_id or "",
            "moduleId": self.module_id or "",
            "priority": self.priority or "Medium",
            "status": self.status or "To Do",
            "progress": self.progress if self.progress is not None else 0,
            "assignedTo": self.assigned_to or "",
            "assignedToName": self.assignee.name if self.assignee else "",
            "reviewerId": self.reviewer_id or "",
            "reviewerName": self.reviewer.name if self.reviewer else "",
            "startDate": self.start_date or "",
            "endDate": self.end_date or "",
            "estimatedHours": self.estimated_hours,
            "label": self.label or "",
            "category": self.category or "general",
            "customData": _loadjson(self.custom_data),
            "parentTaskId": self.parent_task_id or "",
            "createdBy": self.created_by or "",
            "completedAt": _dt(self.completed_at),
            "createdAt": _dt(self.created_at),
        }


class Subtask(Base):
    __tablename__ = "pm_subtasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(50), ForeignKey("pm_tasks.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    is_done = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)

    task = relationship("Task", back_populates="subtasks")

    def to_dict(self):
        return {"id": self.id, "taskId": self.task_id, "title": self.title,
                "isDone": self.is_done, "sortOrder": self.sort_order}


class Comment(Base):
    __tablename__ = "pm_comments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(50), ForeignKey("pm_tasks.id", ondelete="CASCADE"))
    user_id = Column(String(50), ForeignKey("pm_users.id"))
    user_name = Column(String(150))
    text = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="comments")

    def to_dict(self):
        return {"id": self.id, "taskId": self.task_id, "userId": self.user_id,
                "userName": self.user_name, "text": self.text,
                "createdAt": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else ""}


class TaskUpdate(Base):
    __tablename__ = "pm_task_updates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(50), ForeignKey("pm_tasks.id", ondelete="CASCADE"))
    user_id = Column(String(50), ForeignKey("pm_users.id"))
    user_name = Column(String(150))
    update_type = Column(String(50))        # status / progress / remark / assignment
    old_value = Column(String(150))
    new_value = Column(String(150))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="updates")

    def to_dict(self):
        return {
            "id": self.id, "taskId": self.task_id, "userId": self.user_id, "userName": self.user_name,
            "updateType": self.update_type, "oldValue": self.old_value, "newValue": self.new_value,
            "remark": self.remark or "", "createdAt": _dt(self.created_at),
        }


class TaskAttachment(Base):
    __tablename__ = "pm_task_attachments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(50), ForeignKey("pm_tasks.id", ondelete="CASCADE"))
    filename = Column(String(255))
    filepath = Column(String(500))
    uploaded_by = Column(String(50), ForeignKey("pm_users.id"))
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="attachments")

    def to_dict(self):
        return {"id": self.id, "taskId": self.task_id, "filename": self.filename,
                "url": f"/uploads/tasks/{self.filename}", "uploadedBy": self.uploaded_by,
                "uploadedAt": _dt(self.uploaded_at)}


# --------------------------------------------------------------------------- #
#  Timesheets
# --------------------------------------------------------------------------- #
class Timesheet(Base):
    __tablename__ = "pm_timesheets"

    id = Column(String(50), primary_key=True)
    code = Column(String(50))
    user_id = Column(String(50), ForeignKey("pm_users.id", ondelete="CASCADE"))
    project_id = Column(String(50), ForeignKey("pm_projects.id", ondelete="SET NULL"))
    task_id = Column(String(50), ForeignKey("pm_tasks.id", ondelete="SET NULL"))
    work_date = Column(String(20))
    from_time = Column(String(20))
    to_time = Column(String(20))
    total_hours = Column(Float, default=0)
    remarks = Column(Text)
    status = Column(String(30), default="Submitted")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    project = relationship("Project", foreign_keys=[project_id])
    task = relationship("Task", foreign_keys=[task_id])
    attachments = relationship("TimesheetAttachment", back_populates="timesheet", cascade="all, delete-orphan")

    def to_dict(self, include_images=True):
        d = {
            "id": self.id,
            "code": self.code or self.id,
            "userId": self.user_id,
            "employeeName": self.user.name if self.user else "",
            "projectId": self.project_id or "",
            "projectName": self.project.name if self.project else "",
            "taskId": self.task_id or "",
            "taskName": self.task.name if self.task else "",
            "workDate": self.work_date or "",
            "fromTime": self.from_time or "",
            "toTime": self.to_time or "",
            "totalHours": self.total_hours or 0,
            "remarks": self.remarks or "",
            "status": self.status or "Submitted",
            "createdAt": _dt(self.created_at),
        }
        if include_images:
            atts = [a.to_dict() for a in self.attachments]
            d["images"] = [a for a in atts if a["source"] != "file"]
            d["files"] = [a for a in atts if a["source"] == "file"]
        return d


class TimesheetAttachment(Base):
    __tablename__ = "pm_timesheet_attachments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timesheet_id = Column(String(50), ForeignKey("pm_timesheets.id", ondelete="CASCADE"))
    filename = Column(String(255))
    filepath = Column(String(500))
    original_name = Column(String(255))             # user's file name (docs get a uuid filename on disk)
    source = Column(String(20), default="upload")   # upload / camera / file
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    timesheet = relationship("Timesheet", back_populates="attachments")

    def to_dict(self):
        return {"id": self.id, "timesheetId": self.timesheet_id, "filename": self.filename,
                "originalName": self.original_name or self.filename,
                "url": f"/uploads/timesheets/{self.filename}", "source": self.source,
                "uploadedAt": _dt(self.uploaded_at)}


# --------------------------------------------------------------------------- #
#  Monitoring: Idle time & Camera
# --------------------------------------------------------------------------- #
class IdleTimeLog(Base):
    __tablename__ = "pm_idle_time_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), ForeignKey("pm_users.id", ondelete="CASCADE"))
    log_date = Column(String(20))
    idle_start = Column(DateTime)
    idle_end = Column(DateTime)
    duration_seconds = Column(Integer, default=0)
    reason = Column(String(50), default="idle")     # idle / break
    notified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])

    def to_dict(self):
        return {
            "id": self.id, "userId": self.user_id,
            "employeeName": self.user.name if self.user else "",
            "logDate": self.log_date or "",
            "idleStart": _dt(self.idle_start), "idleEnd": _dt(self.idle_end),
            "durationSeconds": self.duration_seconds or 0,
            "durationMinutes": round((self.duration_seconds or 0) / 60, 1),
            "reason": self.reason or "idle", "notified": self.notified,
        }


class CameraActivityLog(Base):
    __tablename__ = "pm_camera_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), ForeignKey("pm_users.id", ondelete="CASCADE"))
    project_id = Column(String(50))
    task_id = Column(String(50))
    timesheet_id = Column(String(50))
    filename = Column(String(255))
    filepath = Column(String(500))
    activity_type = Column(String(50), default="capture")
    captured_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])

    def to_dict(self):
        fname = (self.filename or "").lower()
        media_type = "video" if fname.endswith((".webm", ".mp4")) else "image"
        return {
            "id": self.id, "userId": self.user_id,
            "employeeName": self.user.name if self.user else "",
            "projectId": self.project_id or "", "taskId": self.task_id or "",
            "timesheetId": self.timesheet_id or "",
            "filename": self.filename, "url": f"/uploads/camera/{self.filename}" if self.filename else "",
            "mediaType": media_type,
            "activityType": self.activity_type or "capture",
            "capturedAt": _dt(self.captured_at),
        }


# --------------------------------------------------------------------------- #
#  Notifications, masters, auth tokens, settings
# --------------------------------------------------------------------------- #
class Notification(Base):
    __tablename__ = "pm_notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), ForeignKey("pm_users.id", ondelete="CASCADE"))   # null => admin/broadcast
    type = Column(String(50), default="info")
    title = Column(String(200))
    message = Column(Text)
    link = Column(String(255))
    task_id = Column(String(50))
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id, "userId": self.user_id or "", "type": self.type or "info",
            "title": self.title, "message": self.message, "link": self.link or "",
            "taskId": self.task_id or "", "isRead": self.is_read,
            "createdAt": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else "",
        }


class Client(Base):
    __tablename__ = "pm_clients"
    id = Column(String(50), primary_key=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150))
    status = Column(String(30), default="Active")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "email": self.email or "", "status": self.status or "Active"}


class Department(Base):
    __tablename__ = "pm_departments"
    id = Column(String(50), primary_key=True)
    name = Column(String(150), nullable=False)
    status = Column(String(30), default="Active")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "status": self.status or "Active"}


class Designation(Base):
    __tablename__ = "pm_designations"
    id = Column(String(50), primary_key=True)
    name = Column(String(150), nullable=False)
    status = Column(String(30), default="Active")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "status": self.status or "Active"}


class PasswordResetToken(Base):
    __tablename__ = "pm_password_reset_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), ForeignKey("pm_users.id", ondelete="CASCADE"))
    token_hash = Column(String(255), index=True)
    expires_at = Column(DateTime)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ProfileChangeRequest(Base):
    __tablename__ = "pm_profile_change_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), ForeignKey("pm_users.id", ondelete="CASCADE"))
    field = Column(String(30))                    # email / phone
    old_value = Column(String(255))
    new_value = Column(String(255))
    status = Column(String(20), default="Pending")   # Pending / Approved / Rejected / Cancelled
    reason = Column(Text)                          # admin note (esp. on reject)
    reviewed_by = Column(String(50))
    requested_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime)

    user = relationship("User", foreign_keys=[user_id])

    def to_dict(self):
        return {
            "id": self.id, "userId": self.user_id,
            "employeeName": self.user.name if self.user else "",
            "field": self.field, "oldValue": self.old_value or "", "newValue": self.new_value or "",
            "status": self.status, "reason": self.reason or "", "reviewedBy": self.reviewed_by or "",
            "requestedAt": _dt(self.requested_at), "reviewedAt": _dt(self.reviewed_at),
        }


class ResourceLink(Base):
    __tablename__ = "pm_resource_links"

    id = Column(Integer, primary_key=True, autoincrement=True)
    parent_type = Column(String(20))   # project / task / timesheet
    parent_id = Column(String(50), index=True)
    url = Column(String(1000))
    link_type = Column(String(30), default="other")   # github/figma/drive/maps/api/docs/other
    label = Column(String(200))
    added_by = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id, "parentType": self.parent_type, "parentId": self.parent_id,
            "url": self.url, "linkType": self.link_type or "other", "label": self.label or "",
            "addedBy": self.added_by or "", "createdAt": _dt(self.created_at),
        }


class Lead(Base):
    __tablename__ = "pm_leads"

    id = Column(Integer, primary_key=True, autoincrement=True)   # autoincrement avoids ID clashes
    task_id = Column(String(50), ForeignKey("pm_tasks.id", ondelete="CASCADE"), index=True)
    name = Column(String(150))
    email = Column(String(150))
    phone = Column(String(50))
    company = Column(String(150))
    status = Column(String(30), default="New")   # New/Contacted/Interested/Converted/Lost
    source = Column(String(120))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id, "taskId": self.task_id, "name": self.name, "email": self.email or "",
            "phone": self.phone or "", "company": self.company or "", "status": self.status or "New",
            "source": self.source or "", "notes": self.notes or "", "createdAt": _dt(self.created_at),
        }


class Setting(Base):
    __tablename__ = "pm_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, index=True)
    value = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {"key": self.key, "value": self.value}
