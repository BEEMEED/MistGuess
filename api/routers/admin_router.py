from fastapi import APIRouter, Depends, HTTPException, Request, Query
from services.admin_service import Admin_Panel
from utils.rate_limiter import rate_limit
from schemas.admin_schema import (
    AddLocationAdmin,
    ChangeLocationAdmin,
    BanUserAdmin,
    SendTelegramMessage,
)
from repositories.location_repository import LocationRepository
from utils.dependencies import Dependies
from database.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from models.user import User
import json
router = APIRouter()
admin_panel = Admin_Panel()
Dependies = Dependies()


def require_admin(token: User = Depends(Dependies.get_current_user)):
    if token.role != "admin":
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
    token: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_panel.Add_Location(
        db,
        admin_login=token.username,
        lat=request.lat,
        lon=request.lon,
        region=request.region,
        country=request.country,
    )


@router.patch("/locations/{location_id}")
async def update_location(
    location_id: int,
    request: ChangeLocationAdmin,
    token: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await LocationRepository.change_location(db, location_id, request.model_dump(exclude_none=True))


@router.delete("/locations/{location_id}")
async def delete_location(
    location_id: int,
    token: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_panel.Delete_Location(db, admin_login=token.username, id=location_id)


@router.delete("/users/{user_id}/ban")
@rate_limit(max_requests=5, seconds=60)
async def ban_user(
    user_id: int,
    request: BanUserAdmin,
    req: Request,
    token: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_panel.Ban_User(
        db, admin_login=token.username, id=user_id, reason=request.reason
    )


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    token: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_panel.Change_Role(db, admin_login=token.username, id=user_id)


# @router.post("/users/{user_id}/notifications")
# async def telegram_send_message(
#     user_id: int,
#     request: SendTelegramMessage,
#     token: User = Depends(require_admin),
#     db: AsyncSession = Depends(get_db),
# ):
#     return await admin_panel.send_message_telegram(
#         db, admin_login=token.username, message=request.message, id=user_id
#     )
