from fastapi import HTTPException
from services.authorization import AuthService

from config import config
import logging
from repositories.location_repository import LocationRepository
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.user_repository import UserRepository
from repositories.lobby_repository import LobbyRepository
from repositories.location_repository import LocationRepository

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
        return {"location_id": location.id}

    @staticmethod
    async def Get_Panel_Admin(db: AsyncSession, limit: int, page: int):
        offset = (page - 1) * limit

        users = await UserRepository.get_paginated(db, offset, limit)
        lobbies = await LobbyRepository.get_paginated(db, offset, limit)
        locations = await LocationRepository.get_paginated(db,offset,limit)
        
        total_users = await UserRepository.count_all(db)
        total_lobbies = await LobbyRepository.count_all(db)
        total_locations = await LocationRepository.count_all(db)

        return {
        "data_user": [
            {"id": u.id, "username": u.username, "name": u.name, "xp": u.xp, "rank": u.rank, "role": u.role, "telegram": u.telegram}
            for u in users
        ],
        "data_lobby": [
            {"id": l.id, "invite_code": l.invite_code, "host_id": l.host_id}
            for l in lobbies
        ],
        "data_location": [
            {"id": loc.id, "lat": loc.lat, "lon": loc.lon, "region": loc.region}
            for loc in locations
        ],
        "total_users": total_users,
        "total_lobbies": total_lobbies,
        "total_locations": total_locations,
        "page": page,
        "limit": limit,
    }
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

    @staticmethod
    async def Ban_User(db: AsyncSession, admin_login: str, id: int, reason: str):
        user = await UserRepository.get_by_id(db,id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        await UserRepository.delete(db, id)
        logging.warning(f"Admin {admin_login} banned user {user.name} for {reason}")

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
