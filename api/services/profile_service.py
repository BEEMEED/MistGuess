from config import config
from fastapi import HTTPException, File, UploadFile
import shutil
from pathlib import Path
from pydantic import BaseModel
import os
import logging
from repositories.location_repository import LocationRepository
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.user_repository import UserRepository
from repositories.lobby_repository import LobbyRepository
from repositories.location_repository import LocationRepository
import aiofiles

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path("static/avatars")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class Profile:
    
    @staticmethod
    async def NameEdit(db: AsyncSession, user_id: int, NewName: str):
        
        await UserRepository.update(db,user_id,name=NewName)
        
        logger.info(f"User {user_id} changed name to {NewName}")

    @staticmethod
    async def AvatarEdit(db: AsyncSession, user_id: int, file: UploadFile):
        ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
        MAX_FILE_SIZE = 5 * 1024 * 1024

        content = await file.read()

        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large")

        file_ext = Path(file.filename).suffix.lower() if file.filename else ".jpg"
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Invalid file type.")

        file_path = UPLOAD_DIR / f"{user_id}{file_ext}"

        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)

        avatar_url = f"static/avatars/{user_id}{file_ext}"
        await UserRepository.update(db, user_id, avatar=avatar_url)

        logger.info(f"User {user_id} changed avatar")
        return {"avatar": avatar_url}


    @staticmethod
    async def get_me(db: AsyncSession, user_id: int):
        user = await UserRepository.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        message = {
            "name": user.name,
            "avatar": user.avatar,
            "xp": user.xp,
            "rank": user.rank,
            "role": user.role,
            "country_stats": user.country_stats or {},
        }
        lobbies = await LobbyRepository.get_by_user_id(db, user_id)
        message["lobbies"] = [{"code": lobby.invite_code, "host_id": lobby.host_id} for lobby in lobbies]
        return message
    @staticmethod
    async def get_avatar(db: AsyncSession, user_id: int):
        user = await UserRepository.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user.avatar
