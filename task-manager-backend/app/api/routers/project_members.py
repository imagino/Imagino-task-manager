from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from typing import List

from app.api import schemas
from app.db import models
from app.db.database import get_db
from app.api.deps import get_current_user

router = APIRouter(prefix="/projects/{project_id}/members", tags=["project-members"])


async def _get_project_or_404(project_id: int, db: AsyncSession) -> models.Project:
    result = await db.execute(select(models.Project).where(models.Project.id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _is_project_admin(member: models.ProjectMember | None, user: models.User, project: models.Project) -> bool:
    """True if user is project creator, has project admin role, or is a global admin."""
    if user.role == "admin" or project.created_by == user.id:
        return True
    return member is not None and member.role == "admin"


async def _get_membership(project_id: int, user_id: int, db: AsyncSession) -> models.ProjectMember | None:
    result = await db.execute(
        select(models.ProjectMember).where(
            and_(models.ProjectMember.project_id == project_id,
                 models.ProjectMember.user_id == user_id)
        )
    )
    return result.scalars().first()


def _enrich(member: models.ProjectMember, user: models.User) -> schemas.ProjectMemberResponse:
    """Merge ProjectMember + User into a flat response."""
    return schemas.ProjectMemberResponse(
        id=member.id,
        project_id=member.project_id,
        user_id=member.user_id,
        role=member.role,
        joined_at=member.joined_at,
        user_name=user.name,
        user_email=user.email,
    )


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[schemas.ProjectMemberResponse])
async def list_members(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """List all members of a project."""
    await _get_project_or_404(project_id, db)
    result = await db.execute(
        select(models.ProjectMember, models.User)
        .join(models.User, models.ProjectMember.user_id == models.User.id)
        .where(models.ProjectMember.project_id == project_id)
        .order_by(models.ProjectMember.joined_at)
    )
    rows = result.all()
    return [_enrich(m, u) for m, u in rows]


@router.post("/", response_model=schemas.ProjectMemberResponse, status_code=201)
async def add_member(
    project_id: int,
    data: schemas.AddMemberRequest,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Add a user to a project. Only project admins / creator may do this."""
    project = await _get_project_or_404(project_id, db)
    my_membership = await _get_membership(project_id, current_user.id, db)
    if not _is_project_admin(my_membership, current_user, project):
        raise HTTPException(status_code=403, detail="Only project admins can add members")

    # Validate target user exists
    user_result = await db.execute(select(models.User).where(models.User.id == data.user_id))
    target_user = user_result.scalars().first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check not already a member
    existing = await _get_membership(project_id, data.user_id, db)
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this project")

    if data.role not in ("viewer", "editor", "admin"):
        raise HTTPException(status_code=400, detail="Role must be viewer, editor, or admin")

    member = models.ProjectMember(project_id=project_id, user_id=data.user_id, role=data.role)
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return _enrich(member, target_user)


@router.put("/{user_id}", response_model=schemas.ProjectMemberResponse)
async def update_member_role(
    project_id: int,
    user_id: int,
    data: schemas.UpdateMemberRoleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Change a member's role. Only project admins / creator may do this."""
    project = await _get_project_or_404(project_id, db)
    my_membership = await _get_membership(project_id, current_user.id, db)
    if not _is_project_admin(my_membership, current_user, project):
        raise HTTPException(status_code=403, detail="Only project admins can change roles")

    if data.role not in ("viewer", "editor", "admin"):
        raise HTTPException(status_code=400, detail="Role must be viewer, editor, or admin")

    member = await _get_membership(project_id, user_id, db)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    user_result = await db.execute(select(models.User).where(models.User.id == user_id))
    target_user = user_result.scalars().first()

    member.role = data.role
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return _enrich(member, target_user)


@router.delete("/{user_id}", status_code=204)
async def remove_member(
    project_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Remove a member from a project. Only project admins / creator may do this."""
    project = await _get_project_or_404(project_id, db)
    my_membership = await _get_membership(project_id, current_user.id, db)
    if not _is_project_admin(my_membership, current_user, project):
        raise HTTPException(status_code=403, detail="Only project admins can remove members")

    member = await _get_membership(project_id, user_id, db)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    await db.delete(member)
    await db.commit()
