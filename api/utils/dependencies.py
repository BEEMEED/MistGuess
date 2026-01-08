from config import config
from fastapi import HTTPException, UploadFile, File, Body, Request, Depends
import logging

logger = logging.getLogger(__name__)
from services.authorization import TokenManager
from repositories.user_repository import UserRepository
from database.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.lobby_repository import LobbyRepository


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

            role = user.role
            return {"user_id": user.id, "role": role}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Token validation error: {str(e)}")
            raise HTTPException(401, "invalid token")
