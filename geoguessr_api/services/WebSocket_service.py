from fastapi import WebSocket, APIRouter, Depends, HTTPException, Body
from utils.bd_service import DataBase
from utils.LocationService import LocationService
from services.authorization import AuthService
from starlette.websockets import WebSocketDisconnect
import logging
import asyncio
import time
from config import config
from repositories.location_repository import LocationRepository
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.user_repository import UserRepository
from repositories.lobby_repository import LobbyRepository
from repositories.location_repository import LocationRepository

logger = logging.getLogger(__name__)

router = APIRouter()
auth = AuthService()
locat = LocationService()


class Websocket_service:
    def __init__(self):
        self.connections = {}  # invitecode: [(login, ws)]
        self.games = {}
        self.timers = {}  # invitecode: timer
        self.disconnects = {}  # invitecode: [(login, timer)]

    async def kick_timer(
        self, db: AsyncSession, user_id: int, invitecode: str, ws: WebSocket
    ):
        await asyncio.sleep(180)

        if invitecode not in self.connections:
            return

        if invitecode in self.disconnects and user_id in self.disconnects[invitecode]:
            del self.disconnects[invitecode][user_id]

        await self.player_left(db, user_id, invitecode, ws)

        if invitecode in self.connections:
            for _, ws in self.connections[invitecode]:
                try:
                    await ws.send_json({"type": "player_left", "player": user_id})
                except Exception as e:
                    logger.error(f"Failed to send player_left to connection: {e}")

    def get_active_lobbies(self, user_id: int):
        active_lobby = []
        for invitecode, players in self.connections.items():
            if any(user_id == player_login for player_login, _ in players):
                lobby_info = {
                    "InviteCode": invitecode,
                    "ingame": invitecode in self.games,
                }
                if invitecode in self.games:
                    lobby_info["currentRound"] = self.games[invitecode]["currentRound"]
                    lobby_info["totalRounds"] = self.games[invitecode]["totalRounds"]
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
            await LobbyRepository.add_user(db, InviteCode, user_id)
            lobby = await LobbyRepository.get_by_code(db, InviteCode)

        if InviteCode not in self.connections:
            self.connections[InviteCode] = []
        self.connections[InviteCode].append((user_id, websocket))

        assert lobby
        players_info = []
        for uid in lobby.users:
            info = await self.user_GetInfo(db, uid)
            players_info.append(info)

        message = {
            "type": "player_joined",
            "player": user_id,
            "host": lobby.host_id,
            "max_players": lobby.max_players,
            "total_rounds": lobby.rounds_num,
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
            if InviteCode in self.games:
                del self.games[InviteCode]
            lobby = await LobbyRepository.get_by_code(db, InviteCode)
            if lobby:
                await LobbyRepository.delete(db, InviteCode)
            return

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
            except:
                pass
        logger.info(f"{user.name} sent message {message} to {InviteCode}")

    async def GameStart(self, db: AsyncSession, InviteCode: str):
        lobby = await LobbyRepository.get_by_code(db, InviteCode)
        if not lobby:
            raise HTTPException(status_code=404, detail="InviteCode not found")

        self.games[InviteCode] = {
            "currentRound": 1,
            "totalRounds": lobby.rounds_num,
            "locations": lobby.locations,
            "guesses": {},
        }
        message = {"type": "game_started", "rounds": lobby.rounds_num}
        for _, ws in self.connections[InviteCode]:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send game_started to connection: {e}")
        logger.info(f"Game started for {InviteCode}")

    async def RoundStarted(self, db: AsyncSession, InviteCode: str):
        if InviteCode not in self.games:
            return

        currentRound = self.games[InviteCode]["currentRound"]

        if currentRound > self.games[InviteCode]["totalRounds"]:
            return

        if "RoundStartTime" in self.games[InviteCode] and currentRound in self.games[InviteCode].get("started_rounds", []):
            return

        if "started_rounds" not in self.games[InviteCode]:
            self.games[InviteCode]["started_rounds"] = []
        self.games[InviteCode]["started_rounds"].append(currentRound)

        locations_list = self.games[InviteCode]["locations"]
        current_location = locations_list[currentRound - 1]

        lobby = await LobbyRepository.get_by_code(db, InviteCode)
        if not lobby:
            return

        message = {
            "type": "round_started",
            "round": currentRound,
            "lat": current_location["lat"],
            "lon": current_location["lon"],
            "url": current_location["url"],
            "timer": lobby.timer,
            "RoundStartTime": int(time.time() * 1000),
        }
        self.games[InviteCode]["RoundStartTime"] = int(time.time() * 1000)

        if InviteCode in self.connections:
            for _, ws in self.connections[InviteCode]:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send round_started to connection: {e}")

        if InviteCode in self.timers:
            self.timers[InviteCode].cancel()

        task = asyncio.create_task(self.timer(InviteCode, lobby.timer))
        self.timers[InviteCode] = task

        logger.info(f"Round {currentRound} started for {InviteCode}")

    async def RoundEnded(self, InviteCode: str):
        if InviteCode not in self.games:
            return

        current_round = self.games[InviteCode]["currentRound"]

        if current_round not in self.games[InviteCode]["guesses"]:
            return

        if "ended_rounds" not in self.games[InviteCode]:
            self.games[InviteCode]["ended_rounds"] = []

        if current_round in self.games[InviteCode]["ended_rounds"]:
            return

        self.games[InviteCode]["ended_rounds"].append(current_round)

        locations_list = self.games[InviteCode]["locations"]
        round_guesses = self.games[InviteCode]["guesses"][current_round]
        current_location = locations_list[current_round - 1]

        round_winner = min(round_guesses, key=lambda x: x["distance"])
        next_round_time = int(time.time() * 1000) + 5000

        message = {
            "type": "round_ended",
            "round": current_round,
            "winner": round_winner,
            "results": round_guesses,
            "lat": current_location["lat"],
            "lon": current_location["lon"],
            "nextRoundTime": next_round_time,
        }

        if InviteCode in self.connections:
            for _, ws in self.connections[InviteCode]:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send round_ended to connection: {e}")

        self.games[InviteCode]["currentRound"] += 1
        logger.info(f"Round {current_round} ended for {InviteCode}")

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
                await UserRepository.update(db, user_id, rank=new_rank)

        logger.info(f"Ranks updated for {players}")

    async def GameEnded(self, db: AsyncSession, InviteCode: str):
        if InviteCode not in self.games:
            return

        all_guesses = self.games[InviteCode]["guesses"]

        total_distances = {}
        for round_num, guesses in all_guesses.items():
            for guess in guesses:
                player = guess["player"]
                if player not in total_distances:
                    total_distances[player] = 0
                total_distances[player] += guess["distance"]

        winner = min(total_distances, key=lambda x: total_distances[x])

        players = []
        for user_id, _ in self.connections[InviteCode]:
            info = await self.user_GetInfo(db, user_id)
            players.append(info)

        message = {
            "type": "game_ended",
            "winner": winner,
            "total_distances": total_distances,
            "players": players,
        }

        if InviteCode in self.connections:
            for _, ws in self.connections[InviteCode]:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send game_ended to connection: {e}")

        player_ids = [login for login, _ in self.connections[InviteCode]]

        old_ranks = {}
        for user_id in player_ids:
            user = await UserRepository.get_by_id(db, user_id)
            if user:
                old_ranks[user_id] = user.rank

        for user_id in player_ids:
            user = await UserRepository.get_by_id(db, user_id)
            if user:
                await UserRepository.update(db, user_id, xp=user.xp + 10)

        winner_user = await UserRepository.get_by_id(db, winner)
        if winner_user:
            await UserRepository.update(db, winner_user.id, xp=winner_user.xp + 50)

        await self.user_rank_up(db, player_ids)

        new_ranks = {}
        for user_id in player_ids:
            user = await UserRepository.get_by_id(db, user_id)
            if user:
                new_ranks[user_id] = user.rank

        rank_ups = []
        for user_id in player_ids:
            if old_ranks.get(user_id) != new_ranks.get(user_id):
                rank_ups.append(
                    {
                        "user_id": user_id,
                        "old_rank": old_ranks[user_id],
                        "new_rank": new_ranks[user_id],
                    }
                )

        if rank_ups and InviteCode in self.connections:
            message_rank = {"type": "rank_up", "rank_ups": rank_ups}
            for _, ws in self.connections[InviteCode]:
                try:
                    await ws.send_json(message_rank)
                except Exception as e:
                    logger.error(f"Failed to send rank_up to connection: {e}")

        await asyncio.sleep(0.5)

        if InviteCode in self.games:
            del self.games[InviteCode]

        await LobbyRepository.delete(db, InviteCode)

        logger.info(f"Game ended for {InviteCode}")

    async def submitGuess(
        self, db: AsyncSession, user_id: int, lobbycode: str, lat: float, lon: float
    ):
        logger.info(f"submitGuess called: user={user_id}, lobby={lobbycode}")

        if lobbycode not in self.games or lobbycode not in self.connections:
            logger.warning(f"Lobby {lobbycode} not found in games or connections")
            return

        user = await UserRepository.get_by_id(db, user_id)
        if not user:
            logger.error(f"User {user_id} not found in database")
            raise HTTPException(status_code=404, detail="User not found")

        current_round = self.games[lobbycode]["currentRound"]
        logger.info(f"Current round for {lobbycode}: {current_round}")

        if current_round not in self.games[lobbycode]["guesses"]:
            self.games[lobbycode]["guesses"][current_round] = []

        existing_guess = any(
            g["player"] == user_id
            for g in self.games[lobbycode]["guesses"][current_round]
        )
        if existing_guess:
            logger.warning(f"Player {user_id} already guessed for round {current_round}")
            return

        locations_list = self.games[lobbycode]["locations"]
        current_location = locations_list[current_round - 1]
        lat_cur = current_location["lat"]
        lon_cur = current_location["lon"]
        distance = locat.haversine_m(lat, lon, lat_cur, lon_cur)

        self.games[lobbycode]["guesses"][current_round].append(
            {"player": user_id, "distance": distance, "lat": lat, "lon": lon}
        )

        message = {"type": "player_guessed", "player": user_id}

        if lobbycode in self.connections:
            for _, ws in self.connections[lobbycode]:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send player_guessed to connection: {e}")

        guesses_count = len(self.games[lobbycode]["guesses"][current_round])
        connections_count = len(self.connections[lobbycode])
        logger.info(f"Guesses: {guesses_count}/{connections_count} for {lobbycode}")

        if guesses_count == connections_count:
            logger.info(f"All players guessed! Ending round {current_round} for {lobbycode}")
            await self.RoundEnded(lobbycode)

            if lobbycode not in self.games:
                logger.info(f"Game {lobbycode} was deleted during RoundEnded")
                return

            if (
                self.games[lobbycode]["currentRound"]
                <= self.games[lobbycode]["totalRounds"]
            ):
                logger.info(f"Starting next round for {lobbycode}")
                await asyncio.sleep(5)
                await self.RoundStarted(db, lobbycode)
            else:
                logger.info(f"All rounds completed! Ending game {lobbycode}")
                await self.GameEnded(db, lobbycode)
                return

        if lobbycode in self.games and lobbycode in self.timers:
            self.timers[lobbycode].cancel()

        if lobbycode in self.games:
            task = asyncio.create_task(self.timer(lobbycode, 40))
            self.timers[lobbycode] = task

            await self.broadcast(
                db,
                user_id,
                lobbycode,
                {"type": "timer_short", "timer": 40, "time_stap": time.time()},
            )

        logger.info(f"Player {user_id} guessed for {lobbycode}")

    async def timer(self, lobbycode: str, time: int):
        await asyncio.sleep(time)
        await self.RoundEnded(lobbycode)

    async def reconect(
        self, db: AsyncSession, user_id: int, inviteCode: str, ws: WebSocket
    ):
        if inviteCode not in self.connections:
            raise HTTPException(status_code=404, detail="InviteCode not found")

        if inviteCode in self.disconnects and user_id in self.disconnects[inviteCode]:
            del self.disconnects[inviteCode][user_id]

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
            "max_players": lobby.max_players,
            "total_rounds": lobby.rounds_num,
        }
        if inviteCode in self.games:
            rounds = self.games[inviteCode]["currentRound"]
            current_location = self.games[inviteCode]["locations"][rounds - 1] 

            message["game_state"] = {
                "current_round": rounds,
                "total_rounds": lobby.rounds_num,
                "locations": {
                    "lat": current_location["lat"],
                    "lon": current_location["lon"],
                    "url": current_location["url"],
                },
                "roundstart_time": self.games[inviteCode]["RoundStartTime"],
                "timer": lobby.timer,
            }

            current_round = self.games[inviteCode]["currentRound"]
            if current_round in self.games[inviteCode]["guesses"]:
                player_has_guessed = any(
                    g["player"] == user_id
                    for g in self.games[inviteCode]["guesses"][current_round]
                )
                message["game_state"]["PlayerHasGuessed"] = player_has_guessed
                message["game_state"]["player_guess"] = [
                    g["player"]
                    for g in self.games[inviteCode]["guesses"][current_round]
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


ws_service = Websocket_service()
