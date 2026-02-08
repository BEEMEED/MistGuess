from providers.base import IOAuthProvider
from config import config
from fastapi import HTTPException
import logging
import json
import uuid
logger = logging.getLogger(__name__)

class TelegramOAuthProvider(IOAuthProvider):
    def __init__(self, redis_client) -> None:
        self.redis_client = redis_client
        self.bot_username = config.TELEGRAM_BOT_USERNAME

    async def exchange_code(self, code: str) -> str:
        return code

    async def get_user_data(self, access_token: str) -> dict:
        user_data = await self.redis_client.get(f"telegram:{access_token}")

        if not user_data:
            logger.error("Invalid Telegram response format")
            raise HTTPException(400, "Invalid Telegram response format")

        data = json.loads(user_data)

        return {
            "telegram_id": data["id"],
            "name": data["name"],
            "username": data["username"],
        }

    def get_auth_url(self) -> str:
        session_id = str(uuid.uuid4())

        self.redis_client.setex(f"telegram:{session_id}", 3600, session_id)
        return f"https://t.me/{self.bot_username}?start={session_id}"

