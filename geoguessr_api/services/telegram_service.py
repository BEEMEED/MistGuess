from utils.bd_service import DataBase
from config import config
import secrets
from fastapi import HTTPException
from repositories.location_repository import LocationRepository
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.user_repository import UserRepository
from repositories.lobby_repository import LobbyRepository
from repositories.location_repository import LocationRepository


class telegramAuth:
    def __init__(self) -> None:
        self.code = {}

    def generate_code(self, user_id: int):
        code = secrets.token_urlsafe(6)
        self.code[code] = user_id
        return {"code": code, "user_id": user_id}

    async def link_auth(self,db: AsyncSession, code: str, telegramID: str):
        if code not in self.code:
            raise HTTPException(status_code=400, detail="Invalid code")
        user_id = self.code[code]

        await UserRepository.update(db,user_id=user_id,telegram=telegramID)
        del self.code[code]

        return {"success": True, "user_id": user_id}
