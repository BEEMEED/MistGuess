from fastapi import APIRouter, Depends, File, UploadFile, Request
from services.authorization import AuthService, TokenManager
from services.profile_service import Profile
from schemas.profile_schema import EditName, Leaderboard
from utils.dependencies import Dependies
from database.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.user_repository import UserRepository
from cache.redis import r
import json
from models.user import User
from utils.rate_limiter import rate_limit

dependies = Dependies()
router = APIRouter()
profile = Profile()


@router.patch("/")
async def name_edit(
    request: EditName,
    token: User = Depends(dependies.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await profile.NameEdit(db, token.id, request.new_name)


@router.put("/avatar")
async def avatar_edit(
    file: UploadFile = Depends(dependies.validate_avatar),
    token: User = Depends(dependies.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await profile.AvatarEdit(db, token.id, file)


@router.get("/avatar")
@rate_limit(max_requests=3, seconds=60)
async def avatar_get(request: Request, token: User = Depends(dependies.get_current_user),db: AsyncSession = Depends(get_db)):
    return await profile.get_avatar(db, token.id)


@router.get("/me")
async def me(token: User = Depends(dependies.get_current_user), db: AsyncSession = Depends(get_db)):
    return await profile.get_me(db, token.id)

@router.get("/leaderboard",response_model=list[Leaderboard],)
async def leaderboard(db: AsyncSession = Depends(get_db)):
    cached = await r.get("leaderboard:top5")
    if cached:
        return json.loads(cached)
    
    users = await UserRepository.get_leaderboard(db)
    await r.setex("leaderboard:top5", 300, json.dumps(users))

    return users