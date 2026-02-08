from fastapi import WebSocket, APIRouter, Depends, HTTPException, Body
from utils.LocationService import LocationService
import json
from sqlalchemy import select
from models.user import User
from starlette.websockets import WebSocketDisconnect
import logging
import asyncio
from cache.redis import r
import time
from config import config
from repositories.location_repository import LocationRepository
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.user_repository import UserRepository
from repositories.lobby_repository import LobbyRepository
from repositories.location_repository import LocationRepository
from core.metrics import active_websockets
from services.clan_service import ClanWarService

logger = logging.getLogger(__name__)

router = APIRouter()
locat = LocationService()


class Websocket_service:
    def __init__(self):
        self.connections: dict[str, list[tuple[int, WebSocket]]] = ({})  # invitecode: [(login, ws)]
        # self.games: dict[str, dict] = {}
        self.timers = {}  # invitecode: timer
        # self.disconnects: dict[str,dict[int, float]] = {}  # invitecode: [(login, timer)]


    @staticmethod
    async def _get_game(InviteCode: str):
        data = await r.get(f"game:{InviteCode}")
        if not data:
            return None
        return json.loads(data)
    
    async def kick_timer(
        self, db: AsyncSession, user_id: int, invitecode: str, ws: WebSocket
    ):
        await asyncio.sleep(180)

        if invitecode not in self.connections:
            return

        await r.delete(f"disconnect:{invitecode}:{user_id}")

        await self.player_left(db, user_id, invitecode, ws)

        if invitecode in self.connections:
            for _, ws in self.connections[invitecode]:
                try:
                    await ws.send_json({"type": "player_left", "player": user_id})
                except Exception as e:
                    logger.error(f"Failed to send player_left to connection: {e}")

    async def get_active_lobbies(self, user_id: int):
        active_lobby = []
    
        for invitecode, players in self.connections.items():
            if any(user_id == player_login for player_login, _ in players):
                game = await self._get_game(invitecode)           
                
                lobby_info = {
                    "InviteCode": invitecode,
                    "ingame": True if game else False,
                }


                if game:
                    lobby_info["current_location_index"] = game["current_location_index"]
                    lobby_info["hp"] = game["hp"]
                active_lobby.append(lobby_info)
        return active_lobby

    async def user_GetInfo(self, db: AsyncSession, user_id: int):
        user = await UserRepository.get_by_id(db, user_id)

        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "user_id": user.id,
            "name": user.name,
            "avatar": user.avatar,
            "xp": user.xp,
            "rank": user.rank,
        }

    async def player_joined(
        self, db: AsyncSession, user_id: int, InviteCode: str, websocket: WebSocket
    ):
        lobby = await LobbyRepository.get_by_code(db, InviteCode)

        if not lobby:
            logger.error(f"InviteCode {InviteCode} not found")
            raise HTTPException(status_code=404, detail="InviteCode not found")

        if user_id not in lobby.users:
            if len(lobby.users) >= 2:
                await websocket.close(code=1008, reason="Lobby is full")
                return

            await LobbyRepository.add_user(db, InviteCode, user_id)
            lobby = await LobbyRepository.get_by_code(db, InviteCode)

        if InviteCode not in self.connections:
            self.connections[InviteCode] = []
        self.connections[InviteCode].append((user_id, websocket))
        active_websockets.inc()


        assert lobby
        players_info = [await self.user_GetInfo(db, uid) for uid in lobby.users]

        message = {
            "type": "player_joined",
            "player": user_id,
            "host": lobby.host_id,
            "players": players_info,
        }
        for _, ws in self.connections[InviteCode]:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send player_joined to connection: {e}")
        logger.info(f"{user_id} joined {InviteCode}")

    async def player_left(
        self, db: AsyncSession, user_id: int, InviteCode: str, websocket: WebSocket
    ):
        lobby = await LobbyRepository.get_by_code(db, InviteCode)
        if not lobby and InviteCode not in self.connections:
            return

        if InviteCode not in self.connections:
            return

        self.connections[InviteCode] = [
            (l, ws) for l, ws in self.connections[InviteCode] if ws != websocket
        ]

        if not lobby:
            return

        if user_id in lobby.users:
            await LobbyRepository.remove_user(db, user_id, InviteCode)

        if len(self.connections[InviteCode]) == 0:  
            
            await r.delete(f"game:{InviteCode}")
            lobby = await LobbyRepository.get_by_code(db, InviteCode)
            if lobby:
                await LobbyRepository.delete(db, InviteCode)
            return
        active_websockets.dec()

        players = []
        for user_id, _ in self.connections[InviteCode]:
            info = await self.user_GetInfo(db, user_id)
            players.append(info)

        message = {"type": "player_left", "player": user_id, "players": players}
        if InviteCode in self.connections:
            for _, ws in self.connections[InviteCode]:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send player_left to connection: {e}")
        logger.info(f"{user_id} left {InviteCode}")

    async def broadcast(
        self, db: AsyncSession, user_id: int, InviteCode: str, message: dict
    ):
        if InviteCode not in self.connections:
            return

        user = await UserRepository.get_by_id(db, user_id)
        if not user:
            return

        for _, ws in self.connections[InviteCode]:
            try:
                message_js = {
                    "type": "broadcast",
                    "player": user.name,
                    "message": message,
                }
                await ws.send_json(message_js)
            except Exception as e:
                logger.warning(f"Failed to send broadcast to user: {e}")
        logger.info(f"{user.name} sent message {message} to {InviteCode}")

    async def GameStart(self, db: AsyncSession, InviteCode: str, mode: str | None = None, war_id: int | None = None, user_id: int | None = None, player_id: int | None = None):
        # -- FOR WARS --
        
        lobby = await LobbyRepository.get_by_code(db, InviteCode)
        if not lobby:
            raise HTTPException(status_code=404, detail="InviteCode not found")

        if mode == "clan_wars":
            game = {
                "mode": "clan_wars",
                "war_id": war_id,
                "user_id": user_id,
                "locations": lobby.locations,
                "current_location_index": 0,
                "guesses": {},
                "total_score": 0
            }
            await r.setex(f"game:{InviteCode}", 3600, json.dumps(game))

            message = {
                "type": "game_started", "mode": "clan_war", "timer": 120
            }
            
            for _, ws in self.connections[InviteCode]:
                
                try:
                    await ws.send_json(message)
                
                except Exception as e:
                    logger.error(f"Failed to send game_started to connection: {e}")
            
            logger.info(f"war game started for {InviteCode}")
            return


        game = {
            "current_location_index": 0,
            "locations": lobby.locations,
            "guesses": {},
            "hp": {player_id: 6000 for player_id in lobby.users},
        }
        await r.setex(f"game:{InviteCode}", 3600, json.dumps(game))
        
        message = {
            "type": "game_started",
            "hp": {player_id: 6000 for player_id in lobby.users},
            "timer": 240,
        }
        for _, ws in self.connections[InviteCode]:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send game_started to connection: {e}")
        logger.info(f"Game started for {InviteCode}")

    async def RoundStarted(self, db: AsyncSession, InviteCode: str):
        game = await self._get_game(InviteCode)
        if not game:
            return
        

        currentRound = game["current_location_index"]

        if "started_rounds" not in game:
            game["started_rounds"] = []
        if currentRound in game["started_rounds"]:
            return
        game["started_rounds"].append(currentRound)

        

        locations_list = game["locations"]
        current_location = locations_list[currentRound]

        lobby = await LobbyRepository.get_by_code(db, InviteCode)
        if not lobby:
            return

        message = {
            "type": "round_started",
            "lat": current_location["lat"],
            "lon": current_location["lon"],
            "url": current_location["url"],
            "timer": lobby.timer,
            "RoundStartTime": int(time.time() * 1000),
        }

        game["RoundsStartTime"] = int(time.time() * 1000)
        await r.setex(f"game:{InviteCode}", 3600, json.dumps(game))

        if InviteCode in self.connections:
            for _, ws in self.connections[InviteCode]:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send round_started to connection: {e}")

        if InviteCode in self.timers:
            self.timers[InviteCode].cancel()

        task = asyncio.create_task(self.timer(db, InviteCode, lobby.timer))
        self.timers[InviteCode] = task

        logger.info(f"Round {currentRound} started for {InviteCode}")

    async def RoundEnded(self, db: AsyncSession, InviteCode: str):
        game = await self._get_game(InviteCode)
        if not game:
            return

        locations_list = game["locations"]
        current_index = game["current_location_index"]

        guesses = game.get("guesses", {}).get(str(current_index), [])
        num_guesses = len(guesses)
        
        # --- FOR WARS ---
        if game.get("mode") == "clan_war":
            if num_guesses == 1:
                guess = guesses[0]
                points = await locat.calculate_points(guess["distance"])
                guess["points"] = points
                game["total_score"] = game.get("total_score",0) + points
            if "ended_rounds" not in game:
                game["ended_rounds"] = []
            game["ended_rounds"].append(current_index)
            game["current_location_index"] += 1
        
            if game["current_location_index"] >= len(locations_list):
                await r.setex(f"game:{InviteCode}", 3600, json.dumps(game))
                await self.clan_war_ended(db,InviteCode)
                return
            await r.setex(f"game:{InviteCode}", 3600, json.dumps(game))

            message = {
                "type": "round_ended",
                "total_score": game.get("total_score",0),
                "round": current_index,
            }
            if InviteCode in self.connections:
                for _, ws in self.connections[InviteCode]:
                    try:
                        await ws.send_json(message)
                    except Exception as e:
                        logger.error(f"Failed to send round_ended to connection: {e}")
            await asyncio.sleep(5)
            await self.RoundStarted(db, InviteCode)
            return

        # --- FOR NORMAL GAME ---
        if num_guesses < 2:
            if num_guesses == 0:
                for player_id in game["hp"]:
                    game["hp"][player_id] -= 500
            elif num_guesses == 1:
                player_who_guessed = guesses[0]["player"]
                for player_id in game["hp"]:
                    if player_id != player_who_guessed:
                        game["hp"][player_id] -= 1000

            for player_id, hp in game["hp"].items():
                if hp <= 0:
                    await self.GameEnded(db, InviteCode)
                    return

            message = {
                "type": "round_timedout",
                "hp": game["hp"],
                "num_guesses": num_guesses,
            }
            if InviteCode in self.connections:
                for _, ws in self.connections[InviteCode]:
                    try:
                        await ws.send_json(message)
                    except Exception as e:
                        logger.error(
                            f"Failed to send round_timedout to connection: {e}"
                        )

            if "ended_rounds" not in game:
                game["ended_rounds"] = []
            
            game["ended_rounds"].append(current_index)
            game["current_location_index"] += 1
            await r.setex(f"game:{InviteCode}", 3600, json.dumps(game))
            
            await asyncio.sleep(5)
            await self.RoundStarted(db, InviteCode)
            return

        if "ended_rounds" not in game:
            game["ended_rounds"] = []
        if current_index in game["ended_rounds"]:
            return
        game["ended_rounds"].append(current_index)

        for guess in guesses:
            points = await locat.calculate_points(guess["distance"])
            guess["points"] = points

        current_location = locations_list[current_index]

        winner_guess = max(guesses, key=lambda x: x["points"])
        loser_guess = min(guesses, key=lambda x: x["points"])

        damage = winner_guess["points"] - loser_guess["points"]
        loser_id = loser_guess["player"]

        if loser_id not in game["hp"]:
            lobby = await LobbyRepository.get_by_code(db, InviteCode)
            if lobby:
                game["hp"] = {player_id: 6000 for player_id in lobby.users}
            else:
                logger.error(f"Lobby {InviteCode} not found during HP reinit")
                return

        game["hp"][loser_id] -= damage

        if game["hp"][loser_id] <= 0:
            await self.GameEnded(db, InviteCode)
            return

        message = {
            "type": "round_ended",
            "winner": winner_guess["player"],
            "damage": damage,
            "hp": game["hp"],
            "results": guesses,
            "lat": current_location["lat"],
            "lon": current_location["lon"],
        }

        if InviteCode in self.connections:
            for _, ws in self.connections[InviteCode]:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send round_ended to connection: {e}")

        game["current_location_index"] += 1
        await r.setex(f"game:{InviteCode}", 3600, json.dumps(game))
        await asyncio.sleep(5)
        await self.RoundStarted(db, InviteCode)

        logger.info(f"Round {current_index} ended for {InviteCode}")

    async def user_rank_up(self, db: AsyncSession, players: list):

        for user_id in players:
            user = await UserRepository.get_by_id(db, user_id)
            if not user:
                continue

            cur_xp = user.xp
            new_rank = "Ashborn"
            for xp_threshold, rank in reversed(config.RANKS):
                if cur_xp >= xp_threshold:
                    new_rank = rank
                    break
            if user.rank != new_rank:
                await UserRepository.update(db, user_id, {"rank": new_rank})

        logger.info(f"Ranks updated for {players}")

    async def GameEnded(self, db: AsyncSession, InviteCode: str):
        game = await self._get_game(InviteCode)
        if not game:
            return

        # --- сalculate total distances ---
        all_guesses = game["guesses"]
        total_distances = {}
        for round_num, guesses in all_guesses.items():
            for guess in guesses:
                player = guess["player"]
                if player not in total_distances:
                    total_distances[player] = 0
                total_distances[player] += guess["distance"]

        # --- вetermine winner ---
        winner_id = max(game["hp"], key=lambda x: game["hp"][x])

        # --- players info ---
        players = []
        for user_id, _ in self.connections[InviteCode]:
            info = await self.user_GetInfo(db, user_id)
            players.append(info)

        # --- send game ended message ---
        message = {
            "type": "game_ended",
            "winner": winner_id,
            "total_distances": total_distances,
            "players": players,
        }
        if InviteCode in self.connections:
            for _, ws in self.connections[InviteCode]:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send game_ended to connection: {e}")

        # --- xp rewards ---
        player_ids = [login for login, _ in self.connections[InviteCode]]


        result = await db.execute(select(User).where(User.id.in_(player_ids)))
        users = {user.id: user for user in result.scalars().all()}

        old_ranks = {user_id: users[user_id].rank for user_id in player_ids if user_id in users}

        for user_id in player_ids:
            if user_id in users:
                users[user_id].xp += 10

        if winner_id and winner_id in users:
            users[winner_id].xp += 50

        await db.commit()

        # --- rank up check ---
        await self.user_rank_up(db, player_ids)

        for user in users.values():
            await db.refresh(user)
        new_ranks = {user_id: users[user_id].rank for user_id in player_ids if user_id in users}

        # --- send rank_up notifications ---
        rank_ups = []
        for user_id in player_ids:
            if old_ranks.get(user_id) != new_ranks.get(user_id):
                rank_ups.append({
                    "user_id": user_id,
                    "old_rank": old_ranks[user_id],
                    "new_rank": new_ranks[user_id],
                })

        if rank_ups and InviteCode in self.connections:
            message_rank = {"type": "rank_up", "rank_ups": rank_ups}
            for _, ws in self.connections[InviteCode]:
                try:
                    await ws.send_json(message_rank)
                except Exception as e:
                    logger.error(f"Failed to send rank_up to connection: {e}")

        # --- close/far countries ---

        locations = game["locations"]
        for round_num, guesses in all_guesses.items():
            round_id = int(round_num)
            if round_id >= len(locations):
                continue

            for guess in guesses:
                player_id = guess["player"]
                distance = guess["distance"]
                country = guess.get("country")

                if not country or player_id not in users:
                    continue

                user = users[player_id]
                stats = dict(user.country_stats)

                if country not in stats:
                    stats[country] = {"close": 0, "far": 0}

                if distance <= 500:
                    stats[country]["close"] += 1
                elif distance > 2000:
                    stats[country]["far"] += 1

                user.country_stats = stats
                await db.commit()
        

        # --- cleanup ---
        await asyncio.sleep(0.5)
        await r.delete(f"game:{InviteCode}")
        await LobbyRepository.delete(db, InviteCode)

        logger.info(f"Game ended for {InviteCode}")

    async def submitGuess(
        self, db: AsyncSession, user_id: int, lobbycode: str, lat: float, lon: float
    ):
        logger.info(f"submitGuess called: user={user_id}, lobby={lobbycode}")

        game = await self._get_game(lobbycode)
        if not game or lobbycode not in self.connections:
            logger.warning(f"Lobby {lobbycode} not found in games or connections")
            return

        current_index = game["current_location_index"]
        current_index_str = str(current_index)

        if current_index_str not in game["guesses"]:
            game["guesses"][current_index_str] = []

        existing_guess = any(
            g["player"] == user_id
            for g in game["guesses"][current_index_str]
        )
        if existing_guess:
            logger.warning(
                f"Player {user_id} already guessed for location {current_index}"
            )
            return

        locations_list = game["locations"]
        current_location = locations_list[current_index]
        lat_cur = current_location["lat"]
        lon_cur = current_location["lon"]

        distance = locat.haversine_m(lat, lon, lat_cur, lon_cur)

        game["guesses"][current_index_str].append(
            {"player": user_id, "distance": distance, "lat": lat, "lon": lon, "country": current_location["country"]}
        )
        await r.setex(f"game:{lobbycode}", 3600, json.dumps(game))

        message = {"type": "player_guessed", "player": user_id}
        if lobbycode in self.connections:
            for _, ws in self.connections[lobbycode]:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send player_guessed to connection: {e}")

        guesses_count = len(game["guesses"][current_index_str])
        logger.info(f"Guesses: {guesses_count}/2 for {lobbycode}")

        if guesses_count >= (1 if game.get("mode") == "clan_war" else 2):
            logger.info(f"All players guessed! Ending round for {lobbycode}")
            await self.RoundEnded(db, lobbycode)
        
        game = await self._get_game(lobbycode)
        if not game:
            logger.info(f"Game {lobbycode} was deleted during RoundEnded")
            return

        logger.info(f"Player {user_id} guessed for {lobbycode}")

    async def timer(self, db: AsyncSession, lobbycode: str, time: int):
        await asyncio.sleep(time)
        await self.RoundEnded(db, lobbycode)

    async def reconect(
        self, db: AsyncSession, user_id: int, inviteCode: str, ws: WebSocket
    ):
        if inviteCode not in self.connections:
            raise HTTPException(status_code=404, detail="InviteCode not found")

        await r.delete(f"disconnect:{inviteCode}:{user_id}")

        self.connections[inviteCode] = [
            (l, old_ws) for l, old_ws in self.connections[inviteCode] if l != user_id
        ]
        self.connections[inviteCode].append((user_id, ws))

        lobby = await LobbyRepository.get_by_code(db, inviteCode)
        if not lobby:
            raise HTTPException(status_code=404, detail="InviteCode not found")

        message = {
            "type": "reconnect_succes",
            "host": lobby.host_id,
        }

        game = await self._get_game(inviteCode)
        if game:
            current_index = game["current_location_index"]
            current_index_str = str(current_index)
            current_location = game["locations"][current_index]

            message["game_state"] = {
                "current_location_index": current_index,
                "locations": {
                    "lat": current_location["lat"],
                    "lon": current_location["lon"],
                    "url": current_location["url"],
                },
                "roundstart_time": game["RoundStartTime"],
                "timer": lobby.timer,
                "hp": game["hp"],
            }

            if current_index_str in game["guesses"]:
                player_has_guessed = any(
                    g["player"] == user_id
                    for g in game["guesses"][current_index_str]
                )
                message["game_state"]["PlayerHasGuessed"] = player_has_guessed
                message["game_state"]["player_guess"] = [
                    g["player"]
                    for g in game["guesses"][current_index_str]
                ]

        message["players"] = []
        for user_id, _ in self.connections[inviteCode]:
            info = await self.user_GetInfo(db, user_id)
            message["players"].append(info)

        await ws.send_json(message)

        for login_p, ws_p in self.connections[inviteCode]:
            if login_p != user_id:
                try:
                    await ws_p.send_json(
                        {"type": "player_reconnected", "player": user_id}
                    )
                except Exception as e:
                    logger.error(f"Failed to send player_reconnected to {login_p}: {e}")

        logger.info(f"Player {user_id} reconnected to {inviteCode}")
    
    async def clan_war_ended(self, db: AsyncSession, lobbycode: str):
        game = await self._get_game(lobbycode)
        if not game:
            return
        war_id = game["war_id"]
        user_id = game["user_id"]
        total_score = game.get("total_score",0)

        await ClanWarService.submit_score(db, war_id, user_id, total_score)
        await r.delete(f"game:{lobbycode}")


ws_service = Websocket_service()
