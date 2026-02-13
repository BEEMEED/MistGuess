from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, any_
from models.lobby import Lobby
from sqlalchemy.exc import IntegrityError
import secrets
from repositories.location_repository import LocationRepository
TIMER = 240
class LobbyRepository:
    
    @staticmethod
    async def create(db: AsyncSession,host_id:int, mode: str | None = None, war_id: int | None = None):
        InviteCode = secrets.token_urlsafe(6)
        locations_objs = await LocationRepository.get_random_location(db, 13)
        locations = [{"lat": loc.lat, "lon": loc.lon, "region": loc.region, "url": f"https://www.google.com/maps/@{loc.lat},{loc.lon},17z","country": loc.country} for loc in locations_objs]
        if mode:
            lobby = Lobby(invite_code=InviteCode, host_id=host_id, locations=locations,timer=TIMER,mode=mode,war_id=war_id,users=[host_id])
        else:
            lobby = Lobby(invite_code=InviteCode, host_id=host_id, locations=locations,timer=TIMER,users=[host_id])

        db.add(lobby)
        await db.commit()
        await db.refresh(lobby)
        return lobby
    

    
    @staticmethod
    async def get_by_code(db: AsyncSession, lobby_code: str):
        result = await db.execute(select(Lobby).filter(Lobby.invite_code == lobby_code))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def add_user(db: AsyncSession, lobby_code: str, user_id: int):
        result = await db.execute(select(Lobby).filter(Lobby.invite_code == lobby_code))
        lobby = result.scalar_one_or_none()

        if not lobby:
            return None
        
        if len(lobby.users) >= 2:
            return {"message": "Lobby is full"}

        if user_id in lobby.users:
            return lobby

        
        lobby.users = lobby.users + [user_id]
        await db.commit()
        await db.refresh(lobby)
        return lobby
    
    @staticmethod
    async def remove_user(db: AsyncSession, user_id: int,invite_code: str):
        result = await db.execute(select(Lobby).filter(Lobby.invite_code == invite_code))
        lobby = result.scalar_one_or_none()
        if not lobby:
            return None
        if user_id not in lobby.users:
            return None

       
        lobby.users = [uid for uid in lobby.users if uid != user_id]
        await db.commit()
        await db.refresh(lobby)
        return lobby
    
    @staticmethod
    async def delete(db: AsyncSession, lobby_code: str):
        result = await db.execute(select(Lobby).filter(Lobby.invite_code == lobby_code))
        lobby = result.scalar_one_or_none()
        if not lobby:
            return None
        
        await db.delete(lobby)
        await db.commit()
        return lobby
    
    @staticmethod
    async def get_paginated(db: AsyncSession, offset:int, limit: int):
        result = await db.execute(select(Lobby).offset(offset).limit(limit))
        return result.scalars().all()
    
    @staticmethod
    async def count_all(db: AsyncSession):
        result = await db.execute(select(func.count(Lobby.id)))
        return result.scalar_one()
    
    @staticmethod
    async def get_by_user_id(db: AsyncSession, user_id: int):
        result = await db.execute(
            select(Lobby).where(Lobby.users.overlap([user_id]))
        )
        return result.scalars().all()