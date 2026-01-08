from fastapi import APIRouter, Body, Depends, Request, HTTPException
from services.lobby_service import LobbyService
from services.authorization import AuthService
from utils.LocationService import LocationService
from utils.dependencies import Dependies
from utils.rate_limiter import rate_limit
from database.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.location_repository import LocationRepository

loc = LocationService()
router = APIRouter()
lobby = LobbyService()
dependies = Dependies()


@router.post("/")
@rate_limit(max_requests=10,seconds=60)
async def LobbyCreate(
    request: Request,
    token: dict = Depends(dependies.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await lobby.create_lobby(db, token["user_id"])


@router.put("/{invite_code}/members")
@rate_limit(max_requests=10,seconds=60)
async def LobbyJoin(
    invite_code: str,
    request: Request,
    token: dict = Depends(dependies.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    validate_code = await dependies.get_invite_code(invite_code, db)
    return await lobby.lobby_join(db, invite_code, token["user_id"])


@router.delete("/{invite_code}/members")
async def LobbyLeave(
    invite_code: str,
    token: dict = Depends(dependies.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    validate_code = await dependies.get_invite_code(invite_code, db)
    return await lobby.lobby_leave(db, invite_code, token["user_id"])


@router.get("/random")
async def singleplay(db: AsyncSession = Depends(get_db)):
    locations = await LocationRepository.get_random_location(db, 1)
    if not locations:
        raise HTTPException(status_code=404, detail="No locations available")
    location = locations[0]
    return {"lat": location.lat, "lon": location.lon}
