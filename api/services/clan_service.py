from sqlalchemy.ext.asyncio import AsyncSession
from repositories.clan_repository import ClanRepository
from fastapi import HTTPException
from services.lobby_service import LobbyService
from models.clans import ClanWars
from datetime import datetime
class ClanWarService:
    @staticmethod
    async def play_war(db: AsyncSession, war_id:int, user_id: int):
        war = await ClanRepository.get_war(db, war_id)
        if not war:
            raise HTTPException(status_code=404, detail="War not found")

        if "pairs" not in war.participants or not war.participants["pairs"]:
            raise HTTPException(status_code=400, detail="War pairs not created yet. Both clans must set participants first.")

        pair = next((p for p in war.participants["pairs"] if user_id in (p["clan_1"], p["clan_2"])),None)

        if pair and pair["lobby_id"] is None:
            lobby = await LobbyService.create_lobby(db, user_id, mode="clan_wars", war_id=war_id)
            pair["lobby_id"] = lobby.id
            pair["status"] = "ongoing"
            await ClanRepository.update_participants(db, war_id, {"participants": war.participants})
        elif pair:
            lobby = await LobbyService.get_by_id(db, pair["lobby_id"])
        else:
            raise HTTPException(status_code=404, detail="User not in war")
        
        if lobby is None:
            raise HTTPException(status_code=404, detail="Lobby not found")
        
        return {"InviteCode": lobby.invite_code}
    
    @staticmethod
    async def submit_score(db: AsyncSession, war_id: int, user_id: int, score: int):
        war = await ClanRepository.get_war(db, war_id)
        if not war:
            return
        
        pair = next((p for p in war.participants["pairs"] if user_id in (p["clan_1"], p["clan_2"])),None)
        if not pair:
            return
        
        if user_id == pair["clan_1"]:
            pair["clan_1_score"] = score
        else:
            pair["clan_2_score"] = score
        
        if pair["clan_1_score"] is not None and pair["clan_2_score"] is not None:
            if pair["clan_1_score"] >= pair["clan_2_score"]:
                pair["winner"] = pair["clan_1"]
                war.clan_1_score += 1
            else:
                pair["winner"] = pair["clan_2"]
                war.clan_2_score += 1
            pair["status"] = "completed"

        await ClanRepository.update_participants(db, war_id, {"participants": war.participants})

        if "pairs" in war.participants:
            all_done = all(p["status"] == "completed" for p in war.participants["pairs"])
            if all_done:
                await ClanWarService.finish_war(db, war)

    @staticmethod
    async def finish_war(db: AsyncSession, war: ClanWars):
        winner_id = war.clan_1_id if war.clan_1_score > war.clan_2_score else war.clan_2_id
        loser_id = war.clan_2_id if winner_id == war.clan_1_id else war.clan_1_id

        war.winner_clan_id = winner_id
        war.status = "completed"
        war.completed_at = datetime.now()

        winner_clan = await ClanRepository.get_by_id(db, winner_id)
        loser_clan = await ClanRepository.get_by_id(db, loser_id)

        if winner_clan:
            winner_clan.wars_won += 1
            winner_clan.wars_total += 1
            winner_clan.reputation += 10
            winner_clan.xp += 50

        if loser_clan:
            loser_clan.wars_lost += 1
            loser_clan.wars_total += 1
            loser_clan.reputation -= 5
            loser_clan.xp += 10

        await db.commit()
     
        

