from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from passlib.hash import bcrypt
from utils.bd_service import DataBase
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
    def __init__(self) -> None:
        self.db = DataBase(config.DB_USERS)

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
    
    async def verifyToken(self, token: str):
        try:
            data_token = TokenManager.decode_token(token)
            login = data_token.get("login")

            if not login:
                logger.error("Invalid token: no login")
                raise HTTPException(401, "invalid token")

            data = self.db.read()
            if login not in data:
                logger.error(f"User {login} not found")
                raise HTTPException(401, "user not found")

            return {"login": login}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Token verification error: {str(e)}")
            raise HTTPException(401, "invalid token")

    def LoginGoogle_service(self, code: str):
        try:
            token_url = "https://oauth2.googleapis.com/token"
            data = {
                "code": code,
                "client_id": config.CLIENT_ID,
                "client_secret": config.CLIENT_SECRET,
                "redirect_uri": config.REDIRECT_URI,
                "grant_type": "authorization_code"
            }
            response = requests.post(token_url, data=data)
            tokens = response.json()

            userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
            headers = {"Authorization": f"Bearer {tokens['access_token']}"}
            user_data = requests.get(userinfo_url, headers=headers).json()

            google_id = user_data["id"]
            email = user_data["email"]
            name = user_data["name"]

            data_db = self.db.read()
            if google_id in data_db:
                logger.info(f"Google login success for existing user {google_id}")
                token = TokenManager.create_token({"login": google_id})
                return {"token": token, "login": google_id}

            data_db[google_id] = {"name": name, "google_id": google_id, "avatar": '', "xp": 0, "rank": "Ashborn", "role": "user","telegram": "null"}
            self.db.write(data_db)
            token = TokenManager.create_token({"login": google_id})
            logger.info(f"Google login success for new user {google_id}")
            return {"token": token, "login": google_id}

        except Exception as e:
            logger.error(f"Google login fail: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Google loging fail: {str(e)}")
    
    def GoogleAuth(self):
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
        return RedirectResponse(url=auth_url, status_code=302)



    # --- for tests ---

    def register(self, login: str, password: str):
        data = self.db.read()

        if login in data:
            logger.warning(f"Registration attempt for existing user: {login}")
            raise HTTPException(status_code=400, detail="User already exists")

        hashed_password = pwd_context.hash(password)

        data[login] = {
            "name": login,
            "password": hashed_password,
            "avatar": "",
            "xp": 0,
            "rank": "Ashborn",
            "role": "user",
            "telegram": 'null'
        }

        self.db.write(data)
        logger.info(f"User registered: {login}")
        return {"login": login}

    def login(self, login: str, password: str):
        data = self.db.read()

        if login not in data:
            logger.warning(f"Login attempt for non-existent user: {login}")
            raise HTTPException(status_code=404, detail="User not found")

        user = data[login]

        if "password" not in user:
            logger.warning(f"Login attempt with password for Google user: {login}")
            raise HTTPException(status_code=400, detail="User registered via Google")

        if not pwd_context.verify(password, user["password"]):
            logger.warning(f"Failed login attempt for user: {login}")
            raise HTTPException(status_code=401, detail="Incorrect password")

        logger.info(f"User logged in: {login}")
        token = TokenManager.create_token({"login": login})
        return {"token": token, "login": login}


