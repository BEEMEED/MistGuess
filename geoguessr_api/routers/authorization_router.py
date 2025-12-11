from fastapi import APIRouter, Body, Response, Request, Depends
from database.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from services.authorization import AuthService
from utils.rate_limiter import limiter

Auth = AuthService()
router = APIRouter()


@router.post("/google")
@limiter.limit("3/minute")
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
