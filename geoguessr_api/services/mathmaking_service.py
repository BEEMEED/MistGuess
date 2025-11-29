from fastapi import WebSocket
from config import config
import logging
import asyncio

logger = logging.getLogger(__name__)
from services.lobby_service import LobbyService
from utils.bd_service import DataBase


class mathmaking_service:
    def __init__(self) -> None:
        self.queue = []
        self.lobby = LobbyService()
        self.user_db = DataBase(config.DB_USERS)

    async def join_queue(self, login, ws, xp):
        self.queue = [(l, w, x) for l, w, x in self.queue if l != login]
        self.queue.append((login, ws, xp))
        await ws.send_json({"type": "queue_joined", "position": len(self.queue)})
        logger.info(
            f"User {login} joined matchmaking queue, position: {len(self.queue)}"
        )

    async def mathmaging_loop(self):
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
                                lobby_result = self.lobby.create_lobby(
                                    login_1, 2, 5, 60
                                )
                                invite_code = lobby_result["InviteCode"]

                                self.lobby.lobby_join(login_2, invite_code)

                                user = self.user_db.read()

                                opponent1_info = {
                                    "login": login_1,
                                    "name": user[login_1]["name"],
                                    "xp": xp_1,
                                    "rank": user[login_1]["rank"],
                                    "avatar": user[login_1]["avatar"],
                                }
                                oppenent2_info = {
                                    "login": login_2,
                                    "name": user[login_2]["name"],
                                    "xp": xp_2,
                                    "rank": user[login_2]["rank"],
                                    "avatar": user[login_2]["avatar"],
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

                                await ws_1.send_json(
                                    {"type": "redirect", "LobbyCode": invite_code}
                                )
                                await ws_2.send_json(
                                    {"type": "redirect", "LobbyCode": invite_code}
                                )

                                self.queue.remove((login_1, ws_1, xp_1))
                                self.queue.remove((login_2, ws_2, xp_2))
                                match_found = True
                                break
                            except Exception as e:
                                logger.error(f"Error: {str(e)}")

    async def leave_queue(self, login, ws, xp):
        self.queue = [(l, w, x) for l, w, x in self.queue if l != login]
        logger.info(f"User {login} left matchmaking queue. matchmaking queue size: {len(self.queue)}")

mathmaking_instance = mathmaking_service()