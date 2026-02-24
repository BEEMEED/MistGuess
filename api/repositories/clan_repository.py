from sqlalchemy.ext.asyncio import AsyncSession
from models.clans import Clans, ClanInvite, ClanWars
from sqlalchemy import select
from config import config
import logging
from datetime import datetime
from models.user import User

logger = logging.getLogger(__name__)


class ClanRepository:

    @staticmethod
    async def create(
        name: str,
        owner_id: int,
        members: list[int],
        db: AsyncSession,
        tag: str,
        description: str | None = None,
    ):
        clan = Clans(
            name=name,
            members=members,
            rank=config.CLAN_RANKS[0][1],
            owner_id=owner_id,
            tag=tag,
            member_count=1,
            description=description,
        )

        db.add(clan)
        await db.commit()
        await db.refresh(clan)
        return clan

    @staticmethod
    async def update(db: AsyncSession, clan_id: int, update_data: dict):
        result = await db.execute(select(Clans).where(Clans.id == clan_id))
        result_user = result.scalar_one_or_none()

        if result_user:
            for key, value in update_data.items():
                setattr(result_user, key, value)
            try:
                db.add(result_user)
                await db.commit()
                await db.refresh(result_user)
                return result_user
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to update clan {clan_id}: {e}")
                raise

    @staticmethod
    async def get_by_id(db: AsyncSession, id: int):
        result = await db.execute(select(Clans).filter(Clans.id == id))
        return result.scalar_one_or_none()

    @staticmethod
    async def delete(db: AsyncSession, clan_id: int):
        result = await db.execute(select(Clans).filter(Clans.id == clan_id))
        clan = result.scalar_one_or_none()
        if not clan:
            return None
        await db.delete(clan)
        await db.commit()
        return

    @staticmethod
    async def add_member(user_id: int, db: AsyncSession):
        result = await db.execute(select(Clans).filter(Clans.owner_id == user_id))
        result = result.scalar_one_or_none()
        if result:
            result.members.append(user_id)
            result.member_count += 1
            await db.commit()
            await db.refresh(result)
            return result
        return

    @staticmethod
    async def remove_member(user_id: int, clan_id: int, db: AsyncSession):
        result = await db.execute(select(Clans).filter(Clans.id == clan_id))
        result = result.scalar_one_or_none()
        if result:
            result.members.remove(user_id)
            result.member_count -= 1
            user_data = await db.execute(select(User).filter(User.id == user_id))
            user_data = user_data.scalar_one_or_none()
            if user_data:
                user_data.clan_id = 0
                user_data.clan_role = "none"
                user_data.clan_join_date = None
                await db.commit()
                await db.refresh(result)
                return result

    @staticmethod
    async def update_member_role(user_id: int, db: AsyncSession):
        result = await db.execute(select(Clans).filter(Clans.owner_id == user_id))
        result = result.scalar_one_or_none()
        if result:
            if result.rank == "member":
                result.rank = "admin"
            else:
                result.rank = "member"
            await db.commit()
            await db.refresh(result)
            return result
        return

    @staticmethod
    async def create_invite(db: AsyncSession, clan_id: int, member_id: int, code: str):
        clan_invite = ClanInvite(clan_id=clan_id, inviter_id=member_id, code=code)
        db.add(clan_invite)
        await db.commit()
        await db.refresh(clan_invite)
        return clan_invite

    @staticmethod
    async def get_invite(db: AsyncSession, code: str):
        result = await db.execute(select(ClanInvite).filter(ClanInvite.code == code))
        result_clan_invite = result.scalar_one_or_none()
        return result_clan_invite

    @staticmethod
    async def accept_invite(db: AsyncSession, user_id: int, code: str):
        result = await db.execute(select(ClanInvite).filter(ClanInvite.code == code))
        result_clan_invite = result.scalar_one_or_none()

        if result_clan_invite:
            if result_clan_invite.expires_at is None:
                return
            if result_clan_invite.expires_at < datetime.now():
                return

            result_clan_invite.status = "accepted"
            result_clan_invite.responded_at = datetime.now()

            result_clan = await db.execute(
                select(Clans).filter(Clans.id == result_clan_invite.clan_id)
            )
            result_clan = result_clan.scalar_one_or_none()

            if result_clan:
                result_clan.members.append(user_id)
                result_clan.member_count += 1

            user_result = await db.execute(select(User).filter(User.id == user_id))
            user_result = user_result.scalar_one_or_none()
            if user_result:
                user_result.clan_id = result_clan_invite.clan_id
                user_result.clan_role = "member"
                user_result.clan_join_date = datetime.now()

        await db.commit()
        await db.refresh(result_clan_invite)
        return result_clan_invite

    @staticmethod
    async def create_war(
        db: AsyncSession, attacker_clan_id: int, defender_clan_id: int, user_id: int
    ):
        war = ClanWars(
            clan_1_id=attacker_clan_id,
            clan_2_id=defender_clan_id,
            created_by_user_id=user_id,
            created_at=datetime.now(),
            participants={"clan_1": [], "clan_2": [], "pairs": []},
            round_results=[],
        )
        try:
            db.add(war)
            await db.commit()
            await db.refresh(war)
            return war
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to create war: {e}")
            raise

    @staticmethod
    async def get_war(db: AsyncSession, war_id: int):
        result = await db.execute(select(ClanWars).filter(ClanWars.id == war_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def submit_war(db: AsyncSession, war_id: int):
        war = await db.execute(select(ClanWars).filter(ClanWars.id == war_id))
        result = war.scalar_one_or_none()
        if result:
            result.status = "ongoing"
            result.completed_at = datetime.now()
            result.participants
            await db.commit()
            await db.refresh(result)
            return result

    @staticmethod
    async def declaim_war(db: AsyncSession, war_id: int):
        war = await db.execute(select(ClanWars).filter(ClanWars.id == war_id))
        result = war.scalar_one_or_none()
        if result:
            result.status = "declaimed"
            result.completed_at = datetime.now()
            result.winner_clan_id = result.clan_1_id

            winner_clan = await db.execute(
                select(Clans).filter(Clans.id == result.clan_1_id)
            )
            winner_clan = winner_clan.scalar_one_or_none()
            if winner_clan:
                winner_clan.wars_won += 1
                winner_clan.wars_total += 1
                winner_clan.reputation += 10
                winner_clan.xp += 50

            loser_clan = await db.execute(
                select(Clans).filter(Clans.id == result.clan_2_id)
            )
            loser_clan = loser_clan.scalar_one_or_none()
            if loser_clan:
                loser_clan.wars_lost += 1
                loser_clan.wars_total += 1
                loser_clan.reputation -= 10
                loser_clan.xp -= 25

            await db.commit()
            await db.refresh(result)
            return result

    @staticmethod
    async def set_participants(
        db: AsyncSession, war_id: int, clan_id, players: list[int]
    ):
        war = await db.execute(select(ClanWars).filter(ClanWars.id == war_id))
        result = war.scalar_one_or_none()
        if not result:
            return

        participants = dict(result.participants)

        if clan_id == result.clan_1_id:
            participants["clan_1"] = players
        elif clan_id == result.clan_2_id:
            participants["clan_2"] = players
        else:
            return None

        result.participants = participants
        await db.commit()
        await db.refresh(result)

        if len(participants["clan_1"]) == 5 and len(participants["clan_2"]) == 5:
            await ClanRepository.create_pair(db, war_id)
            db.expire(result)
            await db.refresh(result)
        return result

    @staticmethod
    async def create_pair(db: AsyncSession, war_id: int):
        war = await db.execute(select(ClanWars).filter(ClanWars.id == war_id))
        result = war.scalar_one_or_none()
        if not result or not result.participants:
            return None

        clan_1_ids = result.participants.get("clan_1", [])
        clan_2_ids = result.participants.get("clan_2", [])

        if len(clan_1_ids) != 5 or len(clan_2_ids) != 5:
            return None

        all_ids = clan_1_ids + clan_2_ids
        users_result = await db.execute(select(User).filter(User.id.in_(all_ids)))

        user_xp_map = {user.id: user.xp for user in users_result.scalars().all()}

        clan_1_sorted = sorted(
            clan_1_ids, key=lambda uid: user_xp_map.get(uid, 0), reverse=True
        )
        clan_2_sorted = sorted(
            clan_2_ids, key=lambda uid: user_xp_map.get(uid, 0), reverse=True
        )

        pairs = [
            {
                "clan_1": p1,
                "clan_2": p2,
                "status": "pending",
                "clan_1_score": None,
                "clan_2_score": None,
                "lobby_id": None,
                "winner": None,
            }
            for p1, p2 in zip(clan_1_sorted, clan_2_sorted)
        ]

        result.participants = {
            "clan_1": clan_1_sorted,
            "clan_2": clan_2_sorted,
            "pairs": pairs,
        }

        result.status = "ongoing"
        result.started_at = datetime.now()
        await db.commit()
        await db.refresh(result)
        return result

    @staticmethod
    async def update_participants(db: AsyncSession, war_id: int, participants: dict):
        war = await db.execute(select(ClanWars).filter(ClanWars.id == war_id))
        result = war.scalar_one_or_none()
        if result:
            result.participants = participants
            await db.commit()
            await db.refresh(result)
            return result

    @staticmethod
    async def get_all(db: AsyncSession):
        result = await db.execute(select(Clans))
        return result.scalars().all()
