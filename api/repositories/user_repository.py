from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.user import User
from sqlalchemy.exc import IntegrityError
import logging

logger = logging.getLogger(__name__)


class UserRepository:
    @staticmethod
    async def create(
        db: AsyncSession,
        username: str,
        name: str,
        telegram: str | None = None,
        google_id: str | None = None,
        email: str | None = None,
    ):
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
    async def update(db: AsyncSession, user_id: int, update_data: dict):
        result = await db.execute(select(User).where(User.id == user_id))
        result_user = result.scalar_one_or_none()

        if result_user:
            for key, value in update_data.items():
                setattr(result_user, key, value)
            try:
                db.add(result_user)
                await db.commit()
                await db.refresh(result_user)
                return result_user
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
        users = result.scalars().all()
        return [
            {
                "id": user.id,
                "username": user.username,
                "name": user.name,
                "xp": user.xp,
                "rank": user.rank,
                "avatar": user.avatar,
            }
            for user in users
        ]

    @staticmethod
    async def get_by_telegram(db: AsyncSession, telegram_id: str):
        result = await db.execute(select(User).where(User.telegram == telegram_id))
        return result.scalar_one_or_none()
