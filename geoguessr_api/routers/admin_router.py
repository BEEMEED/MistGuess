from fastapi import APIRouter, Depends, HTTPException
from services.authorization import AuthService
from services.admin_service import Admin_Panel

router = APIRouter()
admin_panel = Admin_Panel()
auth = AuthService()


def require_admin(token: dict = Depends(auth.get_current_user)) -> dict:
    if token["role"] != "admin":
        raise HTTPException(status_code=403, detail="you are not admin")
    return token


@router.get("/main")
async def Admin_Main(
    limit: int = 20, page: int = 1, _: dict = Depends(require_admin)
) -> dict:
    return admin_panel.Get_Panel_Admin(limit, page)


@router.post("/add_location")
async def Admin_Add_Location(
    lat: float, lon: float, region: str, token: dict = Depends(require_admin)
):
    return admin_panel.Add_Location(
        admin_login=token["login"], lat=lat, lon=lon, region=region
    )


@router.patch("/change_location")
async def Admin_Change_Location(
    lat_new: float,
    lon_new: float,
    region_new: str,
    id: int,
    token: dict = Depends(require_admin),
):
    return admin_panel.Change_Location(
        admin_login=token["login"],
        lat_new=lat_new,
        lon_new=lon_new,
        region_new=region_new,
        id=id,
    )


@router.delete("/delete_location")
async def Admin_Delete_Location(id: int, token: dict = Depends(require_admin)):
    return admin_panel.Delete_Location(admin_login=token["login"], id=id)


@router.delete("/ban_user")
async def Admin_Ban_User(login: str, reason: str, token: dict = Depends(require_admin)):
    return await admin_panel.Ban_User(
        admin_login=token["login"], login=login, reason=reason
    )


@router.patch("/add_admin")
async def Admin_Add_Admin(login: str, token: dict = Depends(require_admin)):
    return admin_panel.Change_Role(admin_login=token["role"], login=login)


@router.post("/send_telegram_message")
async def Admin_Send_Telegram_Message(
    login: str, message: str, token: dict = Depends(require_admin)
):
    return admin_panel.send_message_telegram(
        admin_login=token["login"], message=message, login=login
    )
