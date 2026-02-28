from fastapi import HTTPException
from services.authorization import AuthService
import asyncio
from config import config
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from repositories import UserRepository, LobbyRepository, LocationRepository, ReportRepository

auth = AuthService
logger = logging.getLogger(__name__)


class Admin_Panel:

    @staticmethod
    async def Add_Location(
        db: AsyncSession, admin_login: str, lat: float, lon: float, region: str, country: str
    ):
        location = await LocationRepository.add_location(db, lat, lon, region, country)
        if not location:
            raise HTTPException(status_code=400, detail="Failed to add location")

        logger.info(f"Admin {admin_login} added location {location.id} with coordinates ({lat}, {lon}) in region {region}")
        return {"location_id": location.id}



    @staticmethod
    async def Get_locations(db: AsyncSession, limit: int, page: int):
        offset = (page - 1) * limit
        locations, total_locations = await asyncio.gather(
            LocationRepository.get_paginated(db, offset, limit),
            LocationRepository.count_all(db),
        )
        return {
            "data_location": [
                {"id": loc.id, "lat": loc.lat, "lon": loc.lon, "region": loc.region}
                for loc in locations
            ],
            "total_locations": total_locations,
            "page": page,
            "limit": limit,
        }

    @staticmethod
    async def Get_users(db: AsyncSession, limit: int, page: int):
        offset = (page - 1) * limit
        users, total_users = await asyncio.gather(
            UserRepository.get_paginated(db, offset, limit),
            UserRepository.count_all(db),
        )
        return {
            "data_user": [
                {"id": u.id, "username": u.username, "name": u.name, "xp": u.xp, "rank": u.rank, "role": u.role, "telegram": u.telegram, "banned_until": u.ban.banned_until.isoformat() if (u.ban and u.ban.banned_until) else None}
                for u in users
            ],
            "total_users": total_users,
            "page": page,
            "limit": limit,
        }

    @staticmethod
    async def Get_lobbies(db: AsyncSession, limit: int, page: int):
        offset = (page - 1) * limit
        lobbies, total_lobbies = await asyncio.gather(
            LobbyRepository.get_paginated(db, offset, limit),
            LobbyRepository.count_all(db),
        )
        return {
            "data_lobby": [
                {"id": l.id, "invite_code": l.invite_code, "host_id": l.host_id}
                for l in lobbies
            ],
            "total_lobbies": total_lobbies,
            "page": page,
            "limit": limit,
        }

    @staticmethod
    async def Get_reports(db: AsyncSession, limit: int, page: int):
        offset = (page - 1) * limit
        reports, total_reports = await asyncio.gather(
            ReportRepository.get_paginated(db, offset, limit),
            ReportRepository.count_all(db),
        )
        return {
            "data_report": [
                {"id": r.id, "suspect_id": r.suspect_id, "reporter_id": r.reporter_id, "reason": r.reason}
                for r in reports
            ],
            "total_reports": total_reports,
            "page": page,
            "limit": limit,
        }
    
    @staticmethod
    async def Delete_Report(db: AsyncSession, admin_login: str, id: int):
        report = await ReportRepository.delete(db, id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        logging.warning(f"Admin {admin_login} deleted report {id} for user {report.suspect_id} reported by {report.reporter_id} for reason: {report.reason}")
        return 

    @staticmethod
    async def Change_Location(db: AsyncSession,admin_login: str, lat_new: float, lon_new: float, region_new: str, id: int):
        location = await LocationRepository.get_by_id(db, id)
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        if lat_new == 0 or lon_new == 0:
            raise HTTPException(status_code=400, detail="Invalid coordinates")
        location.lat = lat_new
        location.lon = lon_new
        location.region = region_new
        await db.commit()

        logger.warning(
            f"Admin {admin_login} changed location {id} to {lat_new}, {lon_new}, {region_new}"
        )
        return location

    @staticmethod
    async def Delete_Location(db: AsyncSession, admin_login: str, id: int):
        location = await LocationRepository.get_by_id(db, id)
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        await LocationRepository.delete_by_id(db, id)

        logging.warning(f"Admin deleted location {id}")


    # @staticmethod
    # async def send_message_telegram(db: AsyncSession, admin_login: str, message: str, id: int):

    #     user = await UserRepository.get_by_id(db,id)
    #     if not user:
    #         raise HTTPException(status_code=404, detail="User not found")
    #     logging.info(f"Admin {admin_login} sent message to user {user.name}[{user.id}]: {message}")

    @staticmethod
    async def Change_Role(db: AsyncSession, admin_login: str, id: int):
        user = await UserRepository.get_by_id(db,id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.role == "admin":
            raise HTTPException(status_code=409, detail="User is already admin")
        await UserRepository.update(db, id, {"role": "admin"})

        logging.warning(f"Admin {admin_login} changed role of user {user.name}[{user.id}] to admin")
