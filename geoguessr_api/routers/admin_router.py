from fastapi import APIRouter, Depends, HTTPException
from services.authorization import AuthService
from services.admin_service import Admin_Panel
from schemas.admin_schema import AdminRequestMain, AddLocationAdmin, ChangeLocationAdmin, DeleteLocationAdmin, BanUserAdmin, AddAdmin, SendTelegramMessage
router = APIRouter()
admin_panel = Admin_Panel()
auth = AuthService()


def require_admin(token: dict = Depends(auth.get_current_user)) -> dict:
    if token["role"] != "admin":
        raise HTTPException(status_code=403, detail="you are not admin")
    return token


@router.get("/main",)
async def Admin_Main(
    request: AdminRequestMain,  _: dict = Depends(require_admin)) -> dict:
    return admin_panel.Get_Panel_Admin(request.limit, request.page)


@router.post("/add_location")
async def Admin_Add_Location(
    request: AddLocationAdmin, token: dict = Depends(require_admin)
):
    return admin_panel.Add_Location(
        admin_login=token["login"], lat=request.lat, lon=request.lon, region=request.region
    )


@router.patch("/change_location")
async def Admin_Change_Location(
    request: ChangeLocationAdmin,
    token: dict = Depends(require_admin),
):
    return admin_panel.Change_Location(
        admin_login=token["login"],
        lat_new=request.lat_new,
        lon_new=request.lon_new,
        region_new=request.region_new,
        id=request.id,
    )


@router.delete("/delete_location")
async def Admin_Delete_Location(request: DeleteLocationAdmin, token: dict = Depends(require_admin)):
    return admin_panel.Delete_Location(admin_login=token["login"], id=request.id)


@router.delete("/ban_user")
async def Admin_Ban_User(request: BanUserAdmin, token: dict = Depends(require_admin)):
    return await admin_panel.Ban_User(
        admin_login=token["login"], login=request.login, reason=request.reason
    )


@router.patch("/add_admin")
async def Admin_Add_Admin(request: AddAdmin, token: dict = Depends(require_admin)):
    return admin_panel.Change_Role(admin_login=token["role"], login=request.login)


@router.post("/send_telegram_message")
async def Admin_Send_Telegram_Message(
    request: SendTelegramMessage, token: dict = Depends(require_admin)
):
    return admin_panel.send_message_telegram(
        admin_login=token["login"], message=request.message, login=request.login
    )
