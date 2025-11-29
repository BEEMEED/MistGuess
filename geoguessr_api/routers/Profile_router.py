from fastapi import APIRouter, Depends, File, UploadFile
from services.authorization import AuthService, TokenManager
Auth = AuthService()
from services.profile_service import Profile

router = APIRouter()
profile = Profile()


@router.post("/name")
async def name_edit(new_name: str, user: dict = Depends(Auth.get_current_user)):
    return await profile.NameEdit(user["login"], new_name)


@router.post("/avatar")
async def avatar_edit(
    file: UploadFile = File(), token: dict = Depends(Auth.get_current_user)
):
    return await profile.AvatarEdit(token["login"], file)


@router.get("/avatar")
async def avatar_get(token: dict = Depends(Auth.get_current_user)):
    return profile.get_avatar(token["login"])

@router.get("/me")
async def me(token: dict = Depends(Auth.get_current_user)):
    return profile.get_me(token["login"])