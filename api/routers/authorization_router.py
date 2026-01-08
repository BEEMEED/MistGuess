from fastapi import APIRouter, Body, Response, Request, Depends
from database.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from services.authorization import AuthService
from utils.rate_limiter import rate_limit
import json
from cache.redis import r

Auth = AuthService()
router = APIRouter()


@router.post("/google")
@rate_limit(max_requests=5, seconds=60)
async def loginGoogle(request: Request):       
    return await Auth.GoogleAuth()


@router.post("/google/callback")
async def loginGoogleCallback(
    response: Response,
    code: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
):
    result = await Auth.LoginGoogle_service(db, code)
    response.set_cookie(
        key="access_token",
        value=result["token"],
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=604800,
    )
    return {"user_id": result["user_id"], "token": result["token"]}
