from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from models.reports import Reports
from sqlalchemy.exc import IntegrityError
import logging
logger = logging.getLogger(__name__)

class ReportRepository:
    @staticmethod
    async def create(db: AsyncSession, suspect_id: int, reporter_id: int, reason: str, demo: list):
        report = Reports(suspect_id=suspect_id, reporter_id=reporter_id, reason=reason, demo=demo)
        db.add(report)
        await db.commit()
        await db.refresh(report)
        return report
    
    @staticmethod
    async def get_paginated(db: AsyncSession, offset:int, limit: int):
        result = await db.execute(select(Reports).offset(offset).limit(limit))
        return result.scalars().all()
    
    @staticmethod
    async def delete(db: AsyncSession, report_id: int):
        result = await db.execute(select(Reports).filter(Reports.id == report_id))
        report = result.scalar_one_or_none()
        if not report:
            return None
        
        await db.delete(report)
        await db.commit()
        return report
    
    @staticmethod
    async def get_by_id(db: AsyncSession, report_id: int):
        result = await db.execute(select(Reports).filter(Reports.id == report_id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def count_all(db: AsyncSession):
        result = await db.execute(select(func.count(Reports.id)))
        return result.scalar_one()