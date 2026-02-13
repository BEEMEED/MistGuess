from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.locations import Locations
import logging
from sqlalchemy.exc import IntegrityError
import random
logger = logging.getLogger(__name__)

class LocationRepository:
    @staticmethod
    async def get_random_location(db: AsyncSession, rounds: int = 1):
        total = await db.execute(select(func.count(Locations.id)))
        count = total.scalar_one()
        random_ids = random.sample(range(1, count + 1), min(rounds, count))
        result = await db.execute(select(Locations).where(Locations.id.in_(random_ids)))
        return result.scalars().all()
    
    @staticmethod
    async def add_location(db: AsyncSession, lat: float, lon: float, region: str, country: str):
        try:
            location = Locations(lat=lat, lon=lon, region=region, country=country)
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
    async def change_location(db: AsyncSession, id: int, update_data: dict):
        result = await db.execute(select(Locations).where(Locations.id == id))
        result = result.scalar_one_or_none()
        if result:
            for key, value in update_data.items():
                setattr(result, key, value)
            try:
                db.add(result)
                await db.commit()
                await db.refresh(result)
                return result
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to update location {result.id}: {e}")
                raise

    
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