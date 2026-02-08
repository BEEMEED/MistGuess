import logging
import urllib.parse
import requests
from fastapi import APIRouter, HTTPException
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from dotenv import load_dotenv
from config import config
from repositories import user_repository
from utils.token_manager import TokenManager
from repositories.user_repository import UserRepository
import time
from providers.base import IOAuthProvider
from providers.google import GoogleOAuthProvider
from providers.telegram import TelegramOAuthProvider

logger = logging.getLogger(__name__)

load_dotenv()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter()


class AuthService:
    def __init__(
        self,
        user_repository: UserRepository,
        token_manager: TokenManager,
        oauth_provider: IOAuthProvider,
    ) -> None:
        self.user_repository = user_repository
        self.token_manager = token_manager
        self.oauth_provider = oauth_provider

    async def Login_Google_service(self, db: AsyncSession, code: str) -> dict:
        start_time = time.time()
        try:
            access_token = await self.oauth_provider.exchange_code(code)
            user_data = await self.oauth_provider.get_user_data(access_token)

            google_id = user_data["google_id"]
            email = user_data["email"]
            name = user_data["name"]

            user = await UserRepository.get_by_google_id(db, google_id)

            if user:

                logger.info(f"Google login success for existing user {user.id}")
                access_token = TokenManager.create_access_token({"id": user.id})
                refresh_token = TokenManager.create_refresh_token({"id": user.id})

                await UserRepository.update(db, user.id, {"refresh_token": refresh_token})

                return {
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "user_id": user.id,
                }

            username = email.split("@")[0]

            user = await UserRepository.create(
                db=db, google_id=google_id, email=email, name=name, username=username
            )

            refresh_token = TokenManager.create_refresh_token({"id": user.id})
            access_token = TokenManager.create_access_token({"id": user.id})

            logger.info(f"Google login success for new user {user.id}")
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user_id": user.id,
            }

        except Exception as e:
            logger.error(f"Google login fail: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Google loging fail: {str(e)}")

        finally:
            duration = time.time() - start_time

    async def Login_Telegram_service(self, db: AsyncSession, access_token: str) -> dict:
        start_time = time.time()
        try:
            user_data = await self.oauth_provider.get_user_data(access_token)

            telegram_id = user_data["telegram_id"]
            name = user_data["name"]
            username = user_data["username"]

            user = await UserRepository.get_by_telegram(db, telegram_id)

            if user:
                logger.info(f"telegram login success for existing user {user.id}")
                access_token = TokenManager.create_access_token({"id": user.id})
                refresh_token = TokenManager.create_refresh_token({"id": user.id})

                await UserRepository.update(db, user.id, {"refresh_token": refresh_token})

                return {
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "user_id": user.id,
                }

            user = await UserRepository.create(
                db=db, telegram=telegram_id, name=name, username=username
            )

            refresh_token = TokenManager.create_refresh_token({"id": user.id})
            access_token = TokenManager.create_access_token({"id": user.id})

            logger.info(f"telegram login success for new user {user.id}")
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user_id": user.id,
            }
        except Exception as e:
            logger.error(f"telegram login fail: {str(e)}")
            raise HTTPException(status_code=500, detail=f"telegram loging fail")

        finally:
            duration = time.time() - start_time
