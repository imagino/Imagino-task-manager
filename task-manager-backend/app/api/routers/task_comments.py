from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.api import schemas
from app.db import models
from app.db.database import get_db
from app.api.deps import get_current_user

router = APIRouter(prefix="/tasks/{task_id}/comments", tags=["task-comments"])


async def _get_task_or_404(task_id: int, db: AsyncSession) -> models.Task:
    result = await db.execute(select(models.Task).where(models.Task.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


def _enrich(comment: models.TaskComment, author: models.User | None) -> schemas.CommentResponse:
    return schemas.CommentResponse(
        id=comment.id,
        task_id=comment.task_id,
        author_id=comment.author_id,
        content=comment.content,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        author_name=author.name if author else None,
        author_email=author.email if author else None,
    )


@router.get("/", response_model=List[schemas.CommentResponse])
async def list_comments(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """List all comments for a task, oldest first."""
    await _get_task_or_404(task_id, db)
    result = await db.execute(
        select(models.TaskComment, models.User)
        .join(models.User, models.TaskComment.author_id == models.User.id)
        .where(models.TaskComment.task_id == task_id)
        .order_by(models.TaskComment.created_at.asc())
    )
    return [_enrich(c, u) for c, u in result.all()]


@router.post("/", response_model=schemas.CommentResponse, status_code=201)
async def add_comment(
    task_id: int,
    data: schemas.AddCommentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Add a comment to a task."""
    await _get_task_or_404(task_id, db)
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    comment = models.TaskComment(task_id=task_id, author_id=current_user.id, content=data.content.strip())
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return _enrich(comment, current_user)


@router.put("/{comment_id}", response_model=schemas.CommentResponse)
async def edit_comment(
    task_id: int,
    comment_id: int,
    data: schemas.EditCommentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Edit a comment. Only the author or an admin may do this."""
    await _get_task_or_404(task_id, db)
    result = await db.execute(
        select(models.TaskComment).where(
            models.TaskComment.id == comment_id,
            models.TaskComment.task_id == task_id,
        )
    )
    comment = result.scalars().first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this comment")
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    comment.content = data.content.strip()
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return _enrich(comment, current_user)


@router.delete("/{comment_id}", status_code=204)
async def delete_comment(
    task_id: int,
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a comment. Only the author or an admin may do this."""
    await _get_task_or_404(task_id, db)
    result = await db.execute(
        select(models.TaskComment).where(
            models.TaskComment.id == comment_id,
            models.TaskComment.task_id == task_id,
        )
    )
    comment = result.scalars().first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    await db.delete(comment)
    await db.commit()
