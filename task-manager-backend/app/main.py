from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routers import auth, users, projects, project_members, tasks, task_comments
from app.db.database import Base, engine
from app.db import models  # noqa: F401 — must be imported so Base.metadata knows about all tables
import contextlib

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables (useful for dev)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(title="Task Manager Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(project_members.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(task_comments.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to the Task Manager API"}
