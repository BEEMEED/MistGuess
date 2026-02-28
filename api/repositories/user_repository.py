from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from models.user import User
from models.clans import Clans
from sqlalchemy.exc import IntegrityError
import logging
from datetime import datetime
from models import Ban

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
        result = await db.execute(select(User).filter(User.id == id).options(selectinload(User.ban)))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_clan_tag(db: AsyncSession, user: User) -> str | None:
        if not user.clan_id:
            return None
        result = await db.execute(select(Clans).filter(Clans.id == user.clan_id))
        clan = result.scalar_one_or_none()
        return clan.tag if clan else None

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
        result = await db.execute(select(User).offset(offset).limit(limit).options(selectinload(User.ban)))
        return result.scalars().all()

    @staticmethod
    async def count_all(db: AsyncSession):
        result = await db.execute(select(func.count(User.id)))
        return result.scalar_one()

    @staticmethod
    async def get_leaderboard(db: AsyncSession):
        result = await db.execute(select(User).order_by(User.xp.desc()).limit(10))
        users = result.scalars().all()

        leaderboard = []
        for user in users:
            clan_tag = await UserRepository.get_clan_tag(db, user)
            leaderboard.append({
                "id": user.id,
                "username": user.username,
                "name": user.name,
                "xp": user.xp,
                "rank": user.rank,
                "avatar": user.avatar,
                "clan_tag": clan_tag,
            })
        return leaderboard

    @staticmethod
    async def get_by_telegram(db: AsyncSession, telegram_id: str):
        result = await db.execute(select(User).where(User.telegram == telegram_id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def ban_user(db: AsyncSession, user_id: int, reason: str, banned_until: datetime | None = None):
        user = await UserRepository.get_by_id(db, user_id)
        if not user:
            return None
        
        ban = Ban(user_id=user_id, reason=reason, banned_until=banned_until)
        db.add(ban)
        await db.commit()
        await db.refresh(ban)
        return ban
    
    @staticmethod
    async def unban_user(db: AsyncSession, user_id: int):
        result = await db.execute(select(Ban).where(Ban.user_id == user_id))
        ban = result.scalar_one_or_none()
        if not ban:
            return None
        
        await db.delete(ban)
        await db.commit()
        return ban
