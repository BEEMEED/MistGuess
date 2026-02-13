from fastapi import APIRouter, Depends, HTTPException
from utils.dependencies import Dependies
from database.database import get_db
from schemas.clans_schema import ClanRequest
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.clan_repository import ClanRepository
import secrets
from models.user import User
router = APIRouter()
Dependies = Dependies()

@router.post("")
async def create_clan(request: ClanRequest,current_user: User = Depends(Dependies.get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.clan_id != 0:
        raise HTTPException(status_code=400, detail="You are already in a clan")
    if current_user.xp < 500:
        raise HTTPException(status_code=400, detail="Not enough xp")
    return await ClanRepository.create(request.name, current_user.id, [current_user.id],db, request.tag, request.description)

@router.get("/all")
async def get_all_clans(db: AsyncSession = Depends(get_db)):
    return await ClanRepository.get_all(db)

@router.get("")
async def get_clan(current_user: User = Depends(Dependies.get_current_user), db: AsyncSession = Depends(get_db)):
    clan_data = await ClanRepository.get_by_id(db, current_user.clan_id)
    if not clan_data:
        raise HTTPException(status_code=404, detail="Clan not found")

    if not current_user.id in clan_data.members:
        raise HTTPException(status_code=403, detail="You are not a member of this clan")
    return clan_data

@router.delete("")
async def delete_clan(current_user: User = Depends(Dependies.get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.clan_role != "owner":
        raise HTTPException(status_code=403, detail="You are not the owner of this clan")

    clan_data = await ClanRepository.get_by_id(db, current_user.clan_id)
    if not clan_data:
        raise HTTPException(status_code=404, detail="Clan not found")
    
    
    return await ClanRepository.delete(db, current_user.clan_id)

@router.post("/invite")
async def create_invite(current_user: User = Depends(Dependies.get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.clan_role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="You are not a privileged member of this clan")
    clan_data = await ClanRepository.get_by_id(db, current_user.clan_id)
    if not clan_data:
        raise HTTPException(status_code=404, detail="Clan not found")
    return await ClanRepository.create_invite(db, current_user.clan_id, current_user.id, secrets.token_urlsafe(16))

@router.post("/join")
async def join_clan(invite_code: str,current_user: User = Depends(Dependies.get_current_user), db: AsyncSession = Depends(get_db)):
    if invite_code is None or invite_code == "":
        raise HTTPException(status_code=400, detail="Invite code is required")
    invite_data = await ClanRepository.get_invite(db, invite_code)
    if not invite_data:
        raise HTTPException(status_code=404, detail="Invite not found")
    if current_user.clan_id != 0:
        raise HTTPException(status_code=409, detail="You are already in clan")
    return await ClanRepository.accept_invite(db, current_user.id, invite_code)
    
@router.get("/{clan_id}")
async def get_other_clan(clan_id: int, current_user: User = Depends(Dependies.get_current_user), db: AsyncSession = Depends(get_db)):
    return await ClanRepository.get_by_id(db, clan_id)

@router.patch("")
async def update_clan(request: ClanRequest, current_user: User = Depends(Dependies.get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.clan_role != "owner":
        raise HTTPException(status_code=403, detail="You are not the owner of this clan")
    return await ClanRepository.update(db, current_user.clan_id, request.model_dump())

@router.post("/leave")
async def leave_clan(current_user: User = Depends(Dependies.get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.clan_id == 0:
        raise HTTPException(status_code=400, detail="You are not in a clan")
    if current_user.clan_role == "owner":
        raise HTTPException(status_code=403, detail="You are the owner of this clan")
    return await ClanRepository.remove_member(current_user.id, current_user.clan_id, db)

@router.delete("/kick/{user_id}")
async def kick_user(user_id: int, current_user: User = Depends(Dependies.get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.clan_role not in ["owner","admin"]:
        raise HTTPException(status_code=403, detail="You are not the privileged member of this clan")
    
    return await ClanRepository.remove_member(user_id, current_user.clan_id, db)

@router.post("/war/{clan_id}")
async def create_war(clan_id: int, defender_clan_id: int, current_user: User = Depends(Dependies.get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.clan_role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="You are not the admin of this clan")
    return await ClanRepository.create_war(db, clan_id, defender_clan_id, current_user.id)

@router.post("/war/{war_id}/accept")
async def accept_war(war_id: int, current_user: User = Depends(Dependies.get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.clan_role != "owner":
        raise HTTPException(status_code=403, detail="You are not the admin of this clan")
    return await ClanRepository.submit_war(db,war_id)

@router.post("/war/{war_id}/decline")
async def decline_war(war_id: int, current_user: User = Depends(Dependies.get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.clan_role != "owner":
        raise HTTPException(status_code=403, detail="You are not the admin of this clan")
    return await ClanRepository.declaim_war(db,war_id)

@router.post("/war/{war_id}/roster")
async def set_roster(war_id: int, clan_players: list[int], current_user: User = Depends(Dependies.get_current_user), db: AsyncSession = Depends(get_db)):
    await ClanRepository.set_participants(db, war_id, current_user.clan_id, clan_players)

@router.get("/war/{war_id}")
async def get_war(war_id: int, current_user: User = Depends(Dependies.get_current_user), db: AsyncSession = Depends(get_db)):
    return await ClanRepository.get_war(db,war_id)

@router.post("/war/{war_id}/play")
async def play_war(war_id: int, current_user: User = Depends(Dependies.get_current_user), db: AsyncSession = Depends(get_db)):
    from services.clan_service import ClanWarService
    return await ClanWarService.play_war(db, war_id, current_user.id)
# todo throw errors in a custom exception
# todo ьove the check to get_current user