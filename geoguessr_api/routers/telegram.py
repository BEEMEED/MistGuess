from fastapi import APIRouter, Depends
from services.telegram_service import telegramAuth
from services.authorization import AuthService
from pydantic import BaseModel
from utils.dependencies import Dependies
dependies = Dependies()
router = APIRouter()
telega = telegramAuth()


class telegramlinkrequest(BaseModel):
    code: str
    telegramID: str


@router.post("/auth")
async def LinkTelegram(token: dict = Depends(dependies.get_current_user)):
    return telega.generate_code(token["login"])


@router.post("/auth/callback")
async def TelegramCallback(request: telegramlinkrequest):
    return telega.link_auth(request.code, request.telegramID)
