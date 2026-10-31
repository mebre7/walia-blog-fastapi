import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import models
from auth import hash_password
from config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = settings.database_url


async def populate_database():
    engine = create_async_engine(url=DATABASE_URL, echo=True)
    async_session_local = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session_local() as session:
        try:
            logger.info("Starting database population...")

            result = await session.execute(
                select(models.User).where(models.User.email == "mebre@gmail.com")
            )
            user = result.scalar_one_or_none()

            if user is None:
                user = models.User(
                    email="mebre@gmail.com",
                    username="mebre",
                    password_hash=hash_password("password123"),
                )
                session.add(user)
                await session.flush()

            new_post = models.Post(
                category="Productivity & Time Management",
                title="5 Simple Habits to Boost Your Daily Focus and Beat Burnout",
                description="Struggling to stay on task? Discover five practical, low-effort daily habits that help clear mental clutter, protect your energy, and keep you productive without burning out.",
                readTime="5 min",
                author_id=user.user_id,
            )
            session.add(new_post)

            await session.commit()
            logger.info("Database populated successfully!")

        except Exception as e:
            await session.rollback()
            logger.error(f"Error while populating database: {e}")
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(populate_database())
