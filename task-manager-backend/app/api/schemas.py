from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ─── Projects ─────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True

class UpdateProjectRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


# ─── Project Members ───────────────────────────────────────────────────────────

class AddMemberRequest(BaseModel):
    user_id: int
    role: str = "viewer"   # viewer | editor | admin

class UpdateMemberRoleRequest(BaseModel):
    role: str

class ProjectMemberResponse(BaseModel):
    id: int
    project_id: int
    user_id: int
    role: str
    joined_at: datetime
    # Flat user fields joined from the users table
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Tasks ────────────────────────────────────────────────────────────────────

from datetime import date as date_type   # avoid clash with datetime

TASK_STATUSES = ("todo", "in_progress", "in_review", "done", "cancelled")
TASK_PRIORITIES = ("low", "medium", "high", "urgent")

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"
    priority: str = "medium"
    due_date: Optional[date_type] = None
    assigned_to: Optional[int] = None
    project_id: Optional[int] = None

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    due_date: Optional[date_type] = None
    assigned_to: Optional[int] = None
    project_id: Optional[int] = None
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Enriched names
    assigned_to_name: Optional[str] = None
    created_by_name: Optional[str] = None
    project_name: Optional[str] = None

    class Config:
        from_attributes = True

class UpdateTaskRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date_type] = None
    assigned_to: Optional[int] = None
    project_id: Optional[int] = None

class ChangeStatusRequest(BaseModel):
    status: str

class ChangePriorityRequest(BaseModel):
    priority: str

class AssignTaskRequest(BaseModel):
    assigned_to: Optional[int] = None


# ─── Task Comments ─────────────────────────────────────────────────────────────

class AddCommentRequest(BaseModel):
    content: str

class EditCommentRequest(BaseModel):
    content: str

class CommentResponse(BaseModel):
    id: int
    task_id: int
    author_id: int
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    author_name: Optional[str] = None
    author_email: Optional[str] = None

    class Config:
        from_attributes = True





