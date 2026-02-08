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


logger = logging.getLogger(__name__)


class MatchmakingService:
    def __init__(self) -> None:
        self.queue = []

    async def join_queue(self, user_id, ws, xp):
        self.queue = [(l, w, x) for l, w, x in self.queue if l != user_id]
        self.queue.append((user_id, ws, xp))
        await ws.send_json({"type": "queue_joined", "position": len(self.queue)})
        logger.info(
            f"User {user_id} joined matchmaking queue, position: {len(self.queue)}"
        )

    async def matchmaking_loop(self):
        while True:
            await asyncio.sleep(3)

            if len(self.queue) >= 2:
                match_found = False

                for i, (login_1, ws_1, xp_1) in enumerate(self.queue):
                    if match_found:
                        break
                    for login_2, ws_2, xp_2 in self.queue[i + 1 :]:

                        if abs(xp_1 - xp_2) <= 200:
                            logger.info(
                                f"Match found for {login_1} (xp: {xp_1}) and {login_2} (xp: {xp_2})"
                            )

                            try:
                                from database.database import asyncsession

                                async with asyncsession() as db:
                                    lobby = await LobbyRepository.create(
                                        db=db, host_id=login_1
                                    )
                                    invite_code = lobby.invite_code

                                    await LobbyRepository.add_user(
                                        db, invite_code, login_2
                                    )

                                    user1 = await UserRepository.get_by_id(db, login_1)
                                    user2 = await UserRepository.get_by_id(db, login_2)
                                    assert user1
                                    assert user2

                                    asyncio.create_task(self.match_found(ws_1, ws_2, user1, user2, invite_code))
                            except Exception as e:
                                logger.error(f"Error: {str(e)}")

    async def leave_queue(self, login, ws, xp):
        self.queue = [(l, w, x) for l, w, x in self.queue if l != login]
        logger.info(
            f"User {login} left matchmaking queue. matchmaking queue size: {len(self.queue)}"
        )

    async def match_found(self,ws_1: WebSocket, ws_2: WebSocket, user1: User, user2: User, invite_code: str):
        opponent1_info = {
            "user_id": user1.id,
            "name": user1.name,
            "xp": user1.xp,
            "rank": user1.rank,
            "avatar": user1.avatar,
            }
        oppenent2_info = {
            "user_id": user2.id,
            "name": user2.name,
            "xp": user2.xp,
            "rank": user2.rank,
            "avatar": user2.avatar,
            }

        await ws_1.send_json({
            "type": "match_found",
                        "LobbyCode": invite_code,
                        "opponent": oppenent2_info,
                        })
        await ws_2.send_json({
            "type": "match_found",
            "LobbyCode": invite_code,
            "opponent": opponent1_info,
        })
        await asyncio.sleep(2)

        await ws_1.send_json(
            {"type": "redirect", "LobbyCode": invite_code}
        )

        await ws_2.send_json(
            {"type": "redirect", "LobbyCode": invite_code}
        )

        self.queue.remove((user1.id, ws_1, user1.xp))
        self.queue.remove((user2.id, ws_2, user2.xp))
        match_found = True



matchmaking_instance = MatchmakingService()
