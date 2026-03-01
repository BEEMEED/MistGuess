from fastapi import WebSocket
from config import config
import logging
import asyncio
from repositories.location_repository import LocationRepository
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.user_repository import UserRepository
from models.user import User
from repositories.lobby_repository import LobbyRepository
from repositories.location_repository import LocationRepository
import time


logger = logging.getLogger(__name__)


class MatchmakingService:
    def __init__(self) -> None:
        self.queue = []

    async def join_queue(self, user_id, ws, mmr):
        self.queue = [(l, w, m, t) for l, w, m, t in self.queue if l != user_id]
        self.queue.append((user_id, ws, mmr, time.time()))
        await ws.send_json({"type": "queue_joined", "position": len(self.queue)})
        logger.info(
            f"User {user_id} joined matchmaking queue, position: {len(self.queue)}"
        )

    async def matchmaking_loop(self):
        while True:
            await asyncio.sleep(3)

            if len(self.queue) >= 2:
                now = time.time()
                queue = sorted(self.queue, key=lambda x: x[2])

                for i in range(len(queue) - 1):
                    login_1, ws_1, mmr_1, joined_1 = queue[i]
                    login_2, ws_2, mmr_2, joined_2 = queue[i + 1]

                    wait = max(now - joined_1, now - joined_2)
                    threshold = 100 + wait * 5

                    if abs(mmr_1 - mmr_2) <= threshold:
                        logger.info(
                            f"Match found for {login_1} (mmr: {mmr_1}) and {login_2} (mmr: {mmr_2}, threshold: {threshold:.0f})"
                        )

                        self.queue = [
                            (l, w, m, t)
                            for l, w, m, t in self.queue
                            if l not in (login_1, login_2)
                        ]
                        try:
                            from database.database import asyncsession

                            async with asyncsession() as db:
                                lobby = await LobbyRepository.create(
                                    db=db, host_id=login_1, user_2=login_2
                                )

                                invite_code = lobby.invite_code

                                users = await UserRepository.get_by_ids(db, [login_1, login_2])
                                assert users
                                user1, user2 = users[0], users[1]

                                asyncio.create_task(
                                    self.notify_match(
                                        ws_1, ws_2, user1, user2, invite_code
                                    )
                                )
                        except Exception as e:
                            logger.error(f"Error: {str(e)}")
                        break

    async def leave_queue(self, login, ws, mmr):
        self.queue = [(l, w, m, t) for l, w, m, t in self.queue if l != login]
        logger.info(
            f"User {login} left matchmaking queue. matchmaking queue size: {len(self.queue)}"
        )

    async def notify_match(
        self,
        ws_1: WebSocket,
        ws_2: WebSocket,
        user1: User,
        user2: User,
        invite_code: str,
    ):
        opponent1_info = {
            "user_id": user1.id,
            "name": user1.name,
            "mmr": user1.mmr,
            "rank": user1.rank,
            "avatar": user1.avatar,
        }
        oppenent2_info = {
            "user_id": user2.id,
            "name": user2.name,
            "mmr": user2.mmr,
            "rank": user2.rank,
            "avatar": user2.avatar,
        }

        await ws_1.send_json(
            {
                "type": "match_found",
                "LobbyCode": invite_code,
                "opponent": oppenent2_info,
            }
        )
        await ws_2.send_json(
            {
                "type": "match_found",
                "LobbyCode": invite_code,
                "opponent": opponent1_info,
            }
        )
        await asyncio.sleep(2)

        await ws_1.send_json({"type": "redirect", "LobbyCode": invite_code})

        await ws_2.send_json({"type": "redirect", "LobbyCode": invite_code})


matchmaking_instance = MatchmakingService()
