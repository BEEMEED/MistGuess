from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from passlib.hash import bcrypt
from config import config
from fastapi import Depends, HTTPException, APIRouter, Body, Response, Request
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer
import google.oauth2.credentials
import google_auth_oauthlib.flow
import urllib.parse
import requests
from dotenv import load_dotenv
import logging
from repositories.location_repository import LocationRepository
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.user_repository import UserRepository
from repositories.lobby_repository import LobbyRepository
from repositories.location_repository import LocationRepository

logger = logging.getLogger(__name__)

load_dotenv()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter()


class TokenManager:
    @staticmethod
    def create_token(data: dict) -> str:
        to_encode = data.copy()
        to_encode.update({"exp": datetime.utcnow() + timedelta(days=7)})
        return jwt.encode(to_encode, config.SECRET_KEY, algorithm=config.ALGORITHM)

    @staticmethod
    def decode_token(token: str):
        return jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])


class AuthService:

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
            logger.error(f"Token verification error: {str(e)}")
            raise HTTPException(401, "invalid token")

    @staticmethod
    async def LoginGoogle_service(db: AsyncSession, code: str):
        try:
            token_url = "https://oauth2.googleapis.com/token"
            data = {
                "code": code,
                "client_id": config.CLIENT_ID,
                "client_secret": config.CLIENT_SECRET,
                "redirect_uri": config.REDIRECT_URI,
                "grant_type": "authorization_code",
            }
            response = requests.post(token_url, data=data)
            tokens = response.json()

            userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
            headers = {"Authorization": f"Bearer {tokens['access_token']}"}
            user_data = requests.get(userinfo_url, headers=headers).json()

            google_id = user_data["id"]
            email = user_data["email"]
            name = user_data["name"]

            user = await UserRepository.get_by_google_id(db, google_id)

            if user:
                logger.info(f"Google login success for existing user {user.id}")
                token = TokenManager.create_token({"id": user.id})
                return {"token": token, "user_id": user.id}

            username = email.split("@")[0]
            user = await UserRepository.create(db=db,google_id=google_id,username=username)
            await UserRepository.update(db, user.id, name=name)
            token = TokenManager.create_token({"id": user.id})
            logger.info(f"Google login success for new user {google_id}")
            return {"token": token, "user_id": user.id}

        except Exception as e:
            logger.error(f"Google login fail: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Google loging fail: {str(e)}")

    @staticmethod
    async def GoogleAuth():
        baseURL = "https://accounts.google.com/o/oauth2/v2/auth"
        query = {
            "client_id": config.CLIENT_ID,
            "redirect_uri": config.REDIRECT_URI,
            "response_type": "code",
            "scope": " ".join(["email", "openid", "profile"]),
            "access_type": "offline",
        }
        query_string = urllib.parse.urlencode(query, quote_via=urllib.parse.quote)
        auth_url = f"{baseURL}?{query_string}"
        return {"auth_url": auth_url}
