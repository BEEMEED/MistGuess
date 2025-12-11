from fastapi import APIRouter, Depends, File, UploadFile
from services.authorization import AuthService, TokenManager
from services.profile_service import Profile
from schemas.profile_schema import EditName
from utils.dependencies import Dependies
from database.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

dependies = Dependies()
router = APIRouter()
profile = Profile()


@router.patch("/")
async def name_edit(
    request: EditName,
    token: dict = Depends(dependies.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await profile.NameEdit(db, token["user_id"], request.new_name)


@router.put("/avatar")
async def avatar_edit(
    file: UploadFile = Depends(dependies.validate_avatar),
    token: dict = Depends(dependies.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await profile.AvatarEdit(db,token["user_id"], file)


@router.get("/avatar")
async def avatar_get(token: dict = Depends(dependies.get_current_user),db: AsyncSession = Depends(get_db)):
    return await profile.get_avatar(db,token["user_id"])


@router.get("/me")
async def me(token: dict = Depends(dependies.get_current_user), db: AsyncSession = Depends(get_db)):
    return await profile.get_me(db,token["user_id"])
