from fastapi import APIRouter, Body, Response, Request, Depends, HTTPException
from database.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from services.authorization import AuthService
from providers.google import GoogleOAuthProvider
from providers.telegram import TelegramOAuthProvider
from utils.token_manager import TokenManager
from cache.redis import r
from repositories.user_repository import UserRepository
import logging

google_provider = GoogleOAuthProvider()
telegram_provider = TelegramOAuthProvider(redis_client=r)
auth_service_telegram = AuthService(
    user_repository=UserRepository(),
    token_manager=TokenManager(),
    oauth_provider=telegram_provider,
)
auth_service_google = AuthService(
    user_repository=UserRepository(),
    token_manager=TokenManager(),
    oauth_provider=google_provider,
)
router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/telegram")
async def loginTelegram() -> dict:
    auth_url = auth_service_telegram.oauth_provider.get_auth_url()

    session_id = auth_url.split("start=")[-1]
    return {"auth_url": auth_url, "session_id": session_id}


@router.get("/telegram/{session_id}")
async def check_telegram(
    session_id: str, response: Response, db: AsyncSession = Depends(get_db)
) -> dict:
    user_data = await r.get(f"telegram:{session_id}")

    if not user_data:
        return {"status": "pending"}

    result = await auth_service_telegram.Login_Telegram_service(db, session_id)

    await r.delete(f"telegram:{session_id}")

    response.set_cookie(
        key="refresh_token",
        value=result["refresh_token"],
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=30 * 24 * 60 * 60,
    )

    return {
        "status": "success",
        "user_id": result["user_id"],
        "access_token": result["access_token"],
    }


@router.get("/google")
async def loginGoogle() -> dict:
    auth_url = auth_service_google.oauth_provider.get_auth_url()
    return {"auth_url": auth_url}


@router.post("/google/callback")
async def loginGoogleCallback(
    response: Response,
    code: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await auth_service_google.Login_Google_service(db, code)
    response.set_cookie(
        key="refresh_token",
        value=result["refresh_token"],
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=30 * 24 * 60 * 60,
    )
    return {"user_id": result["user_id"], "access_token": result["access_token"]}



@router.post("/refresh")
async def refresh_token(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    try:
        refresh_token = request.cookies.get("refresh_token")

        if not refresh_token:
            raise HTTPException(status_code=401, detail="Refresh token missing")

        decoded = TokenManager.decode_token(refresh_token)
        user_id = decoded.get("id")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = await UserRepository.get_by_id(db, user_id)
        if not user or user.refresh_token != refresh_token:
            raise HTTPException(status_code=401, detail="Invalid token")

        new_access_token = TokenManager.create_access_token({"id": user.id})

        return {"access_token": new_access_token}

    except Exception as e:
        logger.error(f"Refresh token failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token") from e
