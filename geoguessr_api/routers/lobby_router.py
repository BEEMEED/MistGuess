from fastapi import APIRouter, Body, Depends
from services.lobby_service import LobbyService
from services.authorization import AuthService
from utils.LocationService import LocationService
from schemas.lobby_schema import LobbyCreateRequest
from utils.dependencies import get_invite_code
loc = LocationService()
router = APIRouter()
lobby = LobbyService()
Auth = AuthService()


@router.post("/create")
async def LobbyCreate(
    request: LobbyCreateRequest,
    token: dict = Depends(Auth.get_current_user),):
    return lobby.create_lobby(token["login"], request.max_players, request.rounds,request.timer)


@router.post("/join")
async def LobbyJoin(
    InviteCode: str = Depends(get_invite_code),
    token: dict = Depends(Auth.get_current_user),
):
    return lobby.lobby_join(token["login"], InviteCode)


@router.delete("/leave")
async def LobbyLeave(
    InviteCode: str = Depends(get_invite_code),
    token: dict = Depends(Auth.get_current_user),
):
    return lobby.lobby_leave(token["login"], InviteCode)


@router.post("/solo")
async def playSolo():
    result = loc.GetRandomLocation(1)
    return result.get(1, {})
