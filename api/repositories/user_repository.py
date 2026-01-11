from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.user import User
from sqlalchemy.exc import IntegrityError
import logging
logger = logging.getLogger(__name__)

class UserRepository:
    @staticmethod
    async def create(db: AsyncSession, google_id: str, username: str):
        user = User(google_id=google_id, username=username)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def get_by_id(db: AsyncSession, id: int):
        result = await db.execute(select(User).filter(User.id == id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_google_id(db: AsyncSession, google_id: int):
        result = await db.execute(select(User).filter(User.google_id == google_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def update(db: AsyncSession, user_id: int, **kwargs):
        result = await db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            return None
        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)

        try:
            await db.commit()
            await db.refresh(user)
            return user
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to update user {user_id}: {e}")
            raise

    @staticmethod
    async def delete(db: AsyncSession, user_id: int):
        result = await db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return None
        await db.delete(user)
        await db.commit()
        return user

    @staticmethod
    async def get_paginated(db: AsyncSession, offset: int, limit: int):
        result = await db.execute(select(User).offset(offset).limit(limit))
        return result.scalars().all()

    @staticmethod
    async def count_all(db: AsyncSession):
        result = await db.execute(select(func.count(User.id)))
        return result.scalar_one()

    @staticmethod
    async def get_leaderboard(db: AsyncSession):
        result = await db.execute(select(User).order_by(User.xp.desc()).limit(10))
        return result.scalars().all()
        