from fastapi import APIRouter, Body, Depends
from services.lobby_service import LobbyService
from services.authorization import AuthService
from utils.LocationService import LocationService

loc = LocationService()
router = APIRouter()
lobby = LobbyService()
Auth = AuthService()


@router.post("/create")
async def LobbyCreate(
    max_players: int = Body(...),
    rounds: int = Body(...),
    token: dict = Depends(Auth.get_current_user),
    timer: int = Body(...),
):
    return lobby.create_lobby(token["login"], max_players, rounds,timer)


@router.post("/join")
async def LobbyJoin(
    InviteCode: str = Body(..., embed=True),
    token: dict = Depends(Auth.get_current_user),
):
    return lobby.lobby_join(token["login"], InviteCode)


@router.delete("/leave")
async def LobbyLeave(
    InviteCode: str = Body(..., embed=True),
    token: dict = Depends(Auth.get_current_user),
):
    return lobby.lobby_leave(token["login"], InviteCode)


@router.post("/solo")
async def playSolo():
    result = loc.GetRandomLocation(1)
    return result.get(1, {})
