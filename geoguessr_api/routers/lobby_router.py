from fastapi import APIRouter, Body, Depends, Request
from services.lobby_service import LobbyService
from services.authorization import AuthService
from utils.LocationService import LocationService
from schemas.lobby_schema import LobbyCreateRequest
from utils.dependencies import Dependies
from utils.rate_limiter import limiter

loc = LocationService()
router = APIRouter()
lobby = LobbyService()
dependies = Dependies()


@router.post("/")
@limiter.limit("2/minute")
async def LobbyCreate(
    request: LobbyCreateRequest,
    req: Request,
    token: dict = Depends(dependies.get_current_user),
):
    return lobby.create_lobby(
        token["login"], request.max_players, request.rounds, request.timer
    )


@router.put("/{invite_code}/members")
@limiter.limit("2/minute")
async def LobbyJoin(
    invite_code: str,
    request: Request,
    token: dict = Depends(dependies.get_current_user),
):
    validate_code = await dependies.get_invite_code(invite_code)
    return lobby.lobby_join(token["login"], validate_code)


@router.delete("/{invite_code}/members")
async def LobbyLeave(
    invite_code: str,
    token: dict = Depends(dependies.get_current_user),
):
    validate_code = await dependies.get_invite_code(invite_code)
    return lobby.lobby_leave(token["login"], validate_code)


@router.get("/random")
async def playSolo():
    result = loc.GetRandomLocation(1)
    return result.get(1, {})
