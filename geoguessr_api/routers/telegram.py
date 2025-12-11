from fastapi import APIRouter, Depends
from services.telegram_service import telegramAuth
from pydantic import BaseModel
from utils.dependencies import Dependies
from database.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

dependies = Dependies()
router = APIRouter()
telega = telegramAuth()


class telegramlinkrequest(BaseModel):
    code: str
    telegramID: str


@router.post("/auth")
async def LinkTelegram(token: dict = Depends(dependies.get_current_user)):
    return telega.generate_code(token["user_id"])


@router.post("/auth/callback")
async def TelegramCallback(
    request: telegramlinkrequest, db: AsyncSession = Depends(get_db)
):
    return telega.link_auth(db,request.code, request.telegramID)
