from datetime import datetime, timedelta
from jose import jwt
from fastapi import HTTPException
from config import config
from repositories.user_repository import UserRepository
from database.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
import logging
import secrets

logger = logging.getLogger(__name__)
class TokenManager:

    @staticmethod
    def create_access_token(data: dict) -> str:
        to_encode = data.copy()
        to_encode.update({"exp": datetime.utcnow() + timedelta(hours=1), "type": "access"})
        return jwt.encode(to_encode, config.SECRET_KEY, algorithm=config.ALGORITHM)
    
    @staticmethod
    def create_refresh_token(data: dict) -> str:
        to_encode = data.copy()
        to_encode.update({"exp": datetime.utcnow() + timedelta(days=7), "type": "refresh", "jti": secrets.token_urlsafe(32)})
        return jwt.encode(to_encode, config.SECRET_KEY, algorithm=config.ALGORITHM)

    @staticmethod
    def decode_token(token: str):
        return jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])

    @staticmethod
    async def verifyToken(db: AsyncSession, token: str):
        try:
            data_token = TokenManager.decode_token(token)
            id = data_token.get("id")

            if not id:
                logger.error("Invalid token: no username")
                raise HTTPException(401, "invalid token")

            user = await UserRepository.get_by_id(db, id)

            if not user:
                raise HTTPException(401, "user not found")

            return {"user_id": id, "username": user.username, "role": user.role}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Token verification error")
            raise HTTPException(401, "invalid token")