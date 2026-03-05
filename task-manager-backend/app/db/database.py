from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

target_database_url = settings.DATABASE_URL.replace("psycopg2", "asyncpg") if "asyncpg" not in settings.DATABASE_URL else settings.DATABASE_URL
engine = create_async_engine(target_database_url, echo=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            pass
