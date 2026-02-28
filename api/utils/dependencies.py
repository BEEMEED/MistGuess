from config import config
from fastapi import HTTPException, UploadFile, File, Body, Request, Depends, Header
import logging

logger = logging.getLogger(__name__)
from services.authorization import TokenManager
from database.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from repositories import LobbyRepository, UserRepository


class Dependies:

    async def get_invite_code(
        self, InviteCode: str, db: AsyncSession = Depends(get_db)
    ):
        lobby = await LobbyRepository.get_by_code(db, InviteCode)
        if not lobby:
            raise HTTPException(status_code=404, detail="InviteCode not found")
        return InviteCode

    async def validate_avatar(self, file: UploadFile = File(...)) -> UploadFile:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Invalid file type")

        content = await file.read()

        max_size = 5 * 1024 * 1024
        if len(content) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size: {max_size // (1024 * 1024)}MB",
            )

        await file.seek(0)

        return file

    async def get_current_user(
        self, request: Request, db: AsyncSession = Depends(get_db)
    ):
        try:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
            else:
                token = request.cookies.get("access_token")

            if not token:
                logger.error("No token provided")
                raise HTTPException(401, "no token")

            data_token = TokenManager.decode_token(token)
            user_id = data_token.get("id")
            if not user_id:
                raise HTTPException(401, "invalid token")

            user = await UserRepository.get_by_id(db, user_id)
            if not user:
                logger.error(f"user {user_id} not found in database")
                raise HTTPException(401, "invalid token")
            
            if user.ban:
                if user.ban.banned_until and user.ban.banned_until < datetime.now():
                    await UserRepository.unban_user(db, user_id)
                    return user

                raise HTTPException(403, f"user is banned until {user.ban.banned_until} for reason: {user.ban.reason}")

            return user
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Token validation error: {str(e)}")
            raise HTTPException(401, "invalid token")

    @staticmethod
    async def verify_bot_secret(bot_secret: str = Header(None)):
        expected_secret = config.BOT_SECRET

        if not expected_secret:
            raise HTTPException(status_code=500, detail="Bot secret not configured")
        
        if not bot_secret:
            raise HTTPException(status_code=403, detail="Bot secret header required")
        
        if bot_secret != expected_secret:
            raise HTTPException(status_code=403, detail="Invalid bot secret")
        
        return True