from utils.bd_service import DataBase
from config import config
from fastapi import HTTPException, File, UploadFile
import shutil
from pathlib import Path
from pydantic import BaseModel
import os
import logging
from services.WebSocket_service import ws_service


logger = logging.getLogger(__name__)

UPLOAD_DIR = Path("static/avatars")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class Profile:
    def __init__(self) -> None:
        self.db = DataBase(config.DB_USERS)
        self.ws = ws_service

    async def NameEdit(self, login: str, NewName: str):
        data = self.db.read()
        if login not in data:
            logger.error(f"User {login} not found")
            raise HTTPException(status_code=404, detail="User not found")

        if 4 <= len(NewName) and len(NewName) <= 16:
            data[login]["name"] = NewName
            self.db.write(data)
            logger.info(f"User {login} changed name to {NewName}")

    async def AvatarEdit(self, login: str, file: UploadFile = File()):

        if login not in self.db.read():
            logger.error(f"User {login} not found")
            raise HTTPException(status_code=404, detail="User not found")

        if file.content_type and not file.content_type.startswith("image/"):
            logger.error(f"Invalid file type for user {login}")
            raise HTTPException(status_code=400, detail="Invalid file type")

        content = await file.read()

        if len(content) > 5 * 1024 * 1024:
            logger.error(f"File size limit exceeded for user {login}")
            raise HTTPException(status_code=400, detail="File size limit exceeded")

        file_ext = Path(file.filename).suffix if file.filename else ".jpg"
        if not file_ext:
            file_ext = ".jpg"

        file_path = UPLOAD_DIR / f"{login}{file_ext}"
        with open(file_path, "wb") as f:
            f.write(content)

        avatar_url = f"static/avatars/{login}{file_ext}"

        data = self.db.read()
        data[login]["avatar"] = str(avatar_url)
        self.db.write(data)
        logger.info(f"User {login} changed avatar")
        return {"avatar": avatar_url}


    def get_me(self, login: str):
        data = self.db.read()
        
        message = {
            "name": data[login]["name"],
            "avatar": data[login]["avatar"],
            "xp": data[login].get("xp", 0),
            "rank": data[login].get("rank", "Ashborn"),
            "role": data[login].get("role", "user"),
            
        }
        if self.ws:
            message["lobbys"] = self.ws.get_active_lobbies(login)
        return message

    def get_avatar(self, login: str):
        data = self.db.read()
        return data[login]["avatar"]
