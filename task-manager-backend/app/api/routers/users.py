from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.api import schemas
from app.db import models
from app.db.database import get_db
from app.core.security import get_password_hash, verify_password
from app.api.deps import get_current_user, get_current_admin

router = APIRouter(prefix="/users", tags=["users"])


# ─── Own Profile ─────────────────────────────────────────────────────────────

@router.get("/me", response_model=schemas.UserResponse)
async def get_my_profile(current_user: models.User = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return current_user


@router.put("/me", response_model=schemas.UserResponse)
async def update_my_profile(
    data: schemas.UpdateProfileRequest,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update own name and/or email."""
    if data.email and data.email != current_user.email:
        result = await db.execute(select(models.User).where(models.User.email == data.email))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = data.email
    if data.name is not None:
        current_user.name = data.name
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.put("/me/password", status_code=204)
async def change_password(
    data: schemas.ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change own password after verifying the current one."""
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = get_password_hash(data.new_password)
    db.add(current_user)
    await db.commit()


# ─── Admin: User Management ──────────────────────────────────────────────────

@router.get("/", response_model=List[schemas.UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    """List all users. Admin only."""
    result = await db.execute(select(models.User).order_by(models.User.id))
    return result.scalars().all()


@router.get("/{user_id}", response_model=schemas.UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    """Get a specific user by ID. Admin only."""
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}/deactivate", response_model=schemas.UserResponse)
async def deactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    """Deactivate a user account. Admin only."""
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.put("/{user_id}/activate", response_model=schemas.UserResponse)
async def activate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    """Reactivate a deactivated user. Admin only."""
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
