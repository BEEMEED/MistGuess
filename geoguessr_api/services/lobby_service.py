
from config import config
from fastapi import HTTPException, APIRouter, Body, Depends
from services.authorization import AuthService
from utils.LocationService import LocationService
import logging
from repositories.location_repository import LocationRepository
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.user_repository import UserRepository
from repositories.lobby_repository import LobbyRepository
from repositories.location_repository import LocationRepository

logger = logging.getLogger(__name__)

loc = LocationService()


class LobbyService:

    @staticmethod
    async def create_lobby(db: AsyncSession, user_id: int) -> dict:
        lobby = await LobbyRepository.create(db=db,host_id=user_id)
        logging.info(f"User {user_id} created lobby {lobby.invite_code}")
        return {"InviteCode": lobby.invite_code}
        
    @staticmethod
    async def lobby_join(db: AsyncSession, InviteCode: str, user_id: int):
        await LobbyRepository.add_user(db,InviteCode,user_id)
        
        logging.info(f"User {user_id} joined lobby {InviteCode}")
        return {"message": "Successfully joined lobby"}
    
        
    @staticmethod
    async def lobby_leave(db: AsyncSession, InviteCode: str, user_id: int):

        await LobbyRepository.remove_user(db,user_id,InviteCode)

        logging.info(f"User {user_id} left lobby {InviteCode}")
        return {"message": "Successfully left lobby"}






