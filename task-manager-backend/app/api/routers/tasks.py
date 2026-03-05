from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from typing import List, Optional

from app.api import schemas
from app.db import models
from app.db.database import get_db
from app.api.deps import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


# ─── Helper: enrich a Task with names ────────────────────────────────────────

async def _enrich(task: models.Task, db: AsyncSession) -> schemas.TaskResponse:
    assigned_name = None
    creator_name = None
    project_name = None

    if task.assigned_to:
        res = await db.execute(select(models.User).where(models.User.id == task.assigned_to))
        u = res.scalars().first()
        assigned_name = u.name if u else None

    res = await db.execute(select(models.User).where(models.User.id == task.created_by))
    u = res.scalars().first()
    creator_name = u.name if u else None

    if task.project_id:
        res = await db.execute(select(models.Project).where(models.Project.id == task.project_id))
        p = res.scalars().first()
        project_name = p.name if p else None

    return schemas.TaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        due_date=task.due_date,
        assigned_to=task.assigned_to,
        project_id=task.project_id,
        created_by=task.created_by,
        created_at=task.created_at,
        updated_at=task.updated_at,
        assigned_to_name=assigned_name,
        created_by_name=creator_name,
        project_name=project_name,
    )


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/", response_model=schemas.TaskResponse, status_code=201)
async def create_task(
    data: schemas.TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a new task."""
    if data.status not in schemas.TASK_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {schemas.TASK_STATUSES}")
    if data.priority not in schemas.TASK_PRIORITIES:
        raise HTTPException(status_code=400, detail=f"Invalid priority. Choose from: {schemas.TASK_PRIORITIES}")

    task = models.Task(
        title=data.title,
        description=data.description,
        status=data.status,
        priority=data.priority,
        due_date=data.due_date,
        assigned_to=data.assigned_to,
        project_id=data.project_id,
        created_by=current_user.id,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return await _enrich(task, db)


@router.get("/", response_model=List[schemas.TaskResponse])
async def list_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    project_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assigned_to: Optional[int] = Query(None),
):
    """
    List tasks with optional filters.
    - Regular users see only tasks assigned to/created by them.
    - Admins see all tasks.
    """
    stmt = select(models.Task)
    conditions = []

    if project_id:
        conditions.append(models.Task.project_id == project_id)
    if status:
        conditions.append(models.Task.status == status)
    if priority:
        conditions.append(models.Task.priority == priority)
    if assigned_to:
        conditions.append(models.Task.assigned_to == assigned_to)

    # Non-admins only see their own tasks
    if current_user.role != "admin":
        conditions.append(
            (models.Task.created_by == current_user.id) |
            (models.Task.assigned_to == current_user.id)
        )

    if conditions:
        stmt = stmt.where(and_(*conditions))

    stmt = stmt.order_by(
        models.Task.priority.desc(),
        models.Task.due_date.asc().nullslast(),
        models.Task.created_at.desc(),
    )

    result = await db.execute(stmt)
    tasks = result.scalars().all()
    enriched = []
    for t in tasks:
        enriched.append(await _enrich(t, db))
    return enriched


@router.get("/{task_id}", response_model=schemas.TaskResponse)
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """Get a single task by ID."""
    result = await db.execute(select(models.Task).where(models.Task.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return await _enrich(task, db)


@router.put("/{task_id}", response_model=schemas.TaskResponse)
async def update_task(
    task_id: int,
    data: schemas.UpdateTaskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update task details (title, description, due date, assignment, project)."""
    result = await db.execute(select(models.Task).where(models.Task.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this task")

    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.due_date is not None:
        task.due_date = data.due_date
    if data.assigned_to is not None:
        task.assigned_to = data.assigned_to
    if data.project_id is not None:
        task.project_id = data.project_id

    db.add(task)
    await db.commit()
    await db.refresh(task)
    return await _enrich(task, db)


@router.patch("/{task_id}/status", response_model=schemas.TaskResponse)
async def change_status(
    task_id: int,
    data: schemas.ChangeStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Change the status of a task."""
    if data.status not in schemas.TASK_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {schemas.TASK_STATUSES}")
    result = await db.execute(select(models.Task).where(models.Task.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = data.status
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return await _enrich(task, db)


@router.patch("/{task_id}/priority", response_model=schemas.TaskResponse)
async def change_priority(
    task_id: int,
    data: schemas.ChangePriorityRequest,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Change the priority of a task."""
    if data.priority not in schemas.TASK_PRIORITIES:
        raise HTTPException(status_code=400, detail=f"Invalid priority. Choose from: {schemas.TASK_PRIORITIES}")
    result = await db.execute(select(models.Task).where(models.Task.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.priority = data.priority
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return await _enrich(task, db)


@router.patch("/{task_id}/assign", response_model=schemas.TaskResponse)
async def assign_task(
    task_id: int,
    data: schemas.AssignTaskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Assign (or unassign) a task to a user."""
    result = await db.execute(select(models.Task).where(models.Task.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to assign this task")
    task.assigned_to = data.assigned_to
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return await _enrich(task, db)


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a task. Only the creator or admin may delete."""
    result = await db.execute(select(models.Task).where(models.Task.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this task")
    await db.delete(task)
    await db.commit()
