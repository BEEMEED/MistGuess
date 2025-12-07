from utils.bd_service import DataBase
from config import config
from fastapi import HTTPException, UploadFile, File, Body, Request
import logging
logger = logging.getLogger(__name__)
from services.authorization import TokenManager

class Dependies:
    def __init__(self) -> None:
        self.db = DataBase(config.DB_USERS)
    async def get_invite_code(self,InviteCode: str):
        data = DataBase(config.DB_LOBBY).read()
        if InviteCode not in data:
            raise HTTPException(status_code=404, detail="Lobby not found")
        return InviteCode

    async def validate_avatar(self,file: UploadFile = File(...)) -> UploadFile:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Invalid file type")
        
        content = await file.read()

        max_size = 5 * 1024 * 1024 
        if len(content) > max_size:
            raise HTTPException(status_code=400, detail=f"File too large. Max size: {max_size // (1024 * 1024)}MB")
        
        await file.seek(0)
        
        return file


    async def get_current_user(self, request: Request):
        try:
            token = request.cookies.get("access_token")

            if not token:
                logger.error("No token provided")
                raise HTTPException(401, "no token")

            data_token = TokenManager.decode_token(token)
            login = data_token.get("login")

            if not login:
                logger.error("Invalid token: no login in token")
                raise HTTPException(401, "invalid token")

            data = self.db.read()

            if login not in data:
                logger.error(f"User {login} not found in database")
                raise HTTPException(401, "user not found")

            role = data[login].get("role", "user")
            return {"login": login, "role": role}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Token validation error: {str(e)}")
            raise HTTPException(401, "invalid token")
        
        