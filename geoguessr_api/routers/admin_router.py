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

router = APIRouter()
admin_panel = Admin_Panel()
Dependies = Dependies()


def require_admin(token: dict = Depends(Dependies.get_current_user)) -> dict:
    if token["role"] != "admin":
        raise HTTPException(status_code=403, detail="you are not admin")
    return token


@router.get("/")
async def get_admin(
    limit: int = Query(ge=10), page: int = Query(ge=1), _: dict = Depends(require_admin)
) -> dict:
    return admin_panel.Get_Panel_Admin(limit, page)


@router.post("/locations")
async def create_location(
    request: AddLocationAdmin, token: dict = Depends(require_admin)
):
    return admin_panel.Add_Location(
        admin_login=token["login"],
        lat=request.lat,
        lon=request.lon,
        region=request.region,
    )


@router.patch("/locations/{location_id}")
async def update_location(
    location_id: int,
    request: ChangeLocationAdmin,
    token: dict = Depends(require_admin),
):
    return admin_panel.Change_Location(
        admin_login=token["login"],
        lat_new=request.lat_new,
        lon_new=request.lon_new,
        region_new=request.region_new,
        id=location_id,
    )


@router.delete("/locations/{location_id}")
async def delete_location(location_id: int, token: dict = Depends(require_admin)):
    return admin_panel.Delete_Location(admin_login=token["login"], id=location_id)


@router.delete("/users/{user_id}/ban")
@limiter.limit("5/minute")
async def ban_user(
    user_id: str,
    request: BanUserAdmin,
    req: Request,
    token: dict = Depends(require_admin),
):
    return await admin_panel.Ban_User(
        admin_login=token["login"], login=user_id, reason=request.reason
    )


@router.patch("/users/{user_id}/role")
async def update_user_role(user_id: str, token: dict = Depends(require_admin)):
    return admin_panel.Change_Role(admin_login=token["login"], login=user_id)


@router.post("/users/{user_id}/notifications")
async def telegram_send_message(
    user_id: str, request: SendTelegramMessage, token: dict = Depends(require_admin)
):
    return admin_panel.send_message_telegram(
        admin_login=token["login"], message=request.message, login=user_id
    )
