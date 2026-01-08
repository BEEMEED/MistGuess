from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.locations import Locations
from sqlalchemy.exc import IntegrityError
import random

class LocationRepository:
    @staticmethod
    async def get_random_location(db: AsyncSession, rounds: int = 1):
        total = await db.execute(select(func.count(Locations.id)))
        count = total.scalar_one()
        random_ids = random.sample(range(1, count + 1), min(rounds, count))
        result = await db.execute(select(Locations).where(Locations.id.in_(random_ids)))
        return result.scalars().all()
    
    @staticmethod
    async def add_location(db: AsyncSession, lat: float, lon: float, region: str):
        try:
            location = Locations(lat=lat, lon=lon, region=region)
            db.add(location)
            await db.commit()
            await db.refresh(location)
            return location
        except IntegrityError:
            return None
        
    @staticmethod
    async def get_paginated(db: AsyncSession, offset:int, limit: int):
        result = await db.execute(select(Locations).offset(offset).limit(limit))
        return result.scalars().all()
    
    @staticmethod
    async def count_all(db: AsyncSession):
        result = await db.execute(select(func.count(Locations.id)))
        return result.scalar_one()
    
    @staticmethod
    async def change_location(db: AsyncSession):
        result = await db.execute(select(Locations).where(Locations.id == id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_by_id(db: AsyncSession, id: int):
        result = await db.execute(select(Locations).filter(Locations.id == id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def delete_by_id(db: AsyncSession, id: int):
        result = await db.execute(select(Locations).filter(Locations.id == id))
        location = result.scalar_one_or_none()
        if not location:
            return None
        await db.delete(location)
        await db.commit()
        return location