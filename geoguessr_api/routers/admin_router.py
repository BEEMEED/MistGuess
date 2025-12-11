from fastapi import APIRouter, Depends, HTTPException, Request, Query
from services.admin_service import Admin_Panel
from utils.rate_limiter import limiter
from schemas.admin_schema import (
    AddLocationAdmin,
    ChangeLocationAdmin,
    BanUserAdmin,
    SendTelegramMessage,
)
from utils.dependencies import Dependies
from database.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.user_repository import UserRepository

router = APIRouter()
admin_panel = Admin_Panel()
Dependies = Dependies()


def require_admin(token: dict = Depends(Dependies.get_current_user)) -> dict:
    if token["role"] != "admin":
        raise HTTPException(status_code=403, detail="you are not admin")
    return token


@router.get("/")
async def get_admin(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(ge=10),
    page: int = Query(ge=1),
    _: dict = Depends(require_admin),
) -> dict:
    return await admin_panel.Get_Panel_Admin(db, limit, page)


@router.post("/locations")
async def create_location(
    request: AddLocationAdmin,
    token: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    admin_user = await UserRepository.get_by_id(db, token["user_id"])
    if not admin_user:
        raise HTTPException(status_code=401, detail="Admin user not found")
    return await admin_panel.Add_Location(
        db,
        admin_login=admin_user.username,
        lat=request.lat,
        lon=request.lon,
        region=request.region,
    )


@router.patch("/locations/{location_id}")
async def update_location(
    location_id: int,
    request: ChangeLocationAdmin,
    token: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    admin_user = await UserRepository.get_by_id(db, token["user_id"])
    if not admin_user:
        raise HTTPException(status_code=401, detail="Admin user not found")
    return await admin_panel.Change_Location(
        db,
        admin_login=admin_user.username,
        lat_new=request.lat_new,
        lon_new=request.lon_new,
        region_new=request.region_new,
        id=location_id,
    )


@router.delete("/locations/{location_id}")
async def delete_location(
    location_id: int,
    token: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    admin_user = await UserRepository.get_by_id(db, token["user_id"])
    if not admin_user:
        raise HTTPException(status_code=401, detail="Admin user not found")
    return await admin_panel.Delete_Location(db, admin_login=admin_user.username, id=location_id)


@router.delete("/users/{user_id}/ban")
@limiter.limit("5/minute")
async def ban_user(
    user_id: int,
    request: BanUserAdmin,
    req: Request,
    token: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    admin_user = await UserRepository.get_by_id(db, token["user_id"])
    if not admin_user:
        raise HTTPException(status_code=401, detail="Admin user not found")
    return await admin_panel.Ban_User(
        db, admin_login=admin_user.username, id=user_id, reason=request.reason
    )


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    token: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    admin_user = await UserRepository.get_by_id(db, token["user_id"])
    if not admin_user:
        raise HTTPException(status_code=401, detail="Admin user not found")
    return await admin_panel.Change_Role(db, admin_login=admin_user.username, id=user_id)


@router.post("/users/{user_id}/notifications")
async def telegram_send_message(
    user_id: int,
    request: SendTelegramMessage,
    token: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    admin_user = await UserRepository.get_by_id(db, token["user_id"])
    if not admin_user:
        raise HTTPException(status_code=401, detail="Admin user not found")
    return await admin_panel.send_message_telegram(
        db, admin_login=admin_user.username, message=request.message, id=user_id
    )
