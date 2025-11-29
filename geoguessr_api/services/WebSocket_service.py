from fastapi import WebSocket, APIRouter, Depends, HTTPException, Body
from utils.bd_service import DataBase
from utils.LocationService import LocationService
from services.authorization import AuthService
from starlette.websockets import WebSocketDisconnect
import logging
import asyncio
import time

logger = logging.getLogger(__name__)

router = APIRouter()
auth = AuthService()
locat = LocationService()

RANKS = [
    (0, "Ashborn"),
    (100, "Fog Runner"),
    (300, "Tin Sight"),
    (600, "Brass Deceiver"),
    (1000, "Steel Pusher"),
    (1600, "Iron Puller"),
    (2500, "Atium Shadow"),
    (4000, "Mistborn"),
    (6500, "Lord Mistborn"),
]


class Websocket_service:
    def __init__(self):
        from config import config
        self.connections = {} # invitecode: [(login, ws)]
        self.db = DataBase(config.DB_LOBBY)
        self.user_db = DataBase(config.DB_USERS)
        self.games = {} 
        self.timers = {} # invitecode: timer
        self.disconnects = {} # invitecode: [(login, timer)]

    async def kick_timer(self,login: str, invitecode: str, ws: WebSocket):
        await asyncio.sleep(180)
            
        if invitecode in self.disconnects and login in self.disconnects[invitecode]:
            del self.disconnects[invitecode][login]
                
        await self.player_left(login, invitecode, ws)
                
        for _, ws in self.connections[invitecode]:
            try:
                await ws.send_json({"type": "player_left", "player": login})
            except Exception as e:
                print(f"Failed to send player_left to connection: {e}")

    def get_active_lobbies(self,login: str):
        active_lobby = []
        for invitecode, players in self.connections.items():
            if any(login == player_login for player_login, _ in players):
                lobby_info = {
                    "InviteCode": invitecode,
                    "ingame": invitecode in self.games,
                }
                if invitecode in self.games:
                    lobby_info["currentRound"] = self.games[invitecode]["currentRound"]
                    lobby_info["totalRounds"] = self.games[invitecode]["totalRounds"]
                active_lobby.append(lobby_info)
        return active_lobby
        
    def user_GetInfo(self, login: str):
        data = self.user_db.read()

        return {
            "login": login,
            "name": data[login]["name"],
            "avatar": data[login]["avatar"],
            "xp": data[login].get("xp", 0),
            "rank": data[login].get("rank", "Ashborn"),
        }

    async def player_joined(self, login: str, InviteCode: str, websocket: WebSocket):

        if InviteCode not in self.db.read():
            raise HTTPException(status_code=404, detail="InviteCode not found")
            logger.error(f"InviteCode {InviteCode} not found")

        if InviteCode not in self.connections:
            self.connections[InviteCode] = []

        data = self.db.read()
        self.connections[InviteCode].append((login, websocket))

        players_info = [
            self.user_GetInfo(player_login)
            for player_login in data[InviteCode]["users"]
        ]

        message = {
            "type": "player_joined",
            "player": login,
            "host": data[InviteCode]["host"],
            "max_players": data[InviteCode]["max_players"],
            "total_rounds": data[InviteCode]["RoundsNum"],
            "players": players_info,
        }
        print(message)
        for _, ws in self.connections[InviteCode]:
            try:
                await ws.send_json(message)
            except Exception as e:
                print(f"Failed to send player_joined to connection: {e}")
        logger.info(f"{login} joined {InviteCode}")

    async def player_left(self, login: str, InviteCode: str, websocket: WebSocket):
        data = self.db.read()
        if InviteCode not in data and InviteCode not in self.connections:
            return

        self.connections[InviteCode] = [
            (l, ws) for l, ws in self.connections[InviteCode] if ws != websocket
        ]
        if InviteCode in data:
            data[InviteCode]["users"] = [
                (l, ws) for l, ws in self.connections[InviteCode] if ws != websocket
            ]

            if login in data[InviteCode]["users"]:
                data[InviteCode]["users"].remove(login)
                self.db.write(data)

        if len(self.connections[InviteCode]) == 0:

            if InviteCode in self.games:
                del self.games[InviteCode]
            if InviteCode in data:
                del data[InviteCode]
                self.db.write(data)

        players = [
            self.user_GetInfo(player_login)
            for player_login, _ in self.connections[InviteCode]
        ]

        message = {"type": "player_left", "player": login, "players": players}
        print(message)
        for _, ws in self.connections[InviteCode]:
            try:
                await ws.send_json(message)
            except Exception as e:
                print(f"Failed to send player_left to connection: {e}")
        logger.info(f"{login} left {InviteCode}")

    async def broadcast(self, login: str, InviteCode: str, message: dict):
        if InviteCode not in self.connections:
            return

        for _, ws in self.connections[InviteCode]:
            try:
                message_js = {"type": "broadcast", "player": login, "message": message}
                print(message)
                await ws.send_json(message_js)
            except:
                pass
        logger.info(f"{login} sent message {message} to {InviteCode}")

    async def GameStart(self, InviteCode: str):
        data = self.db.read()
        self.games[InviteCode] = {
            "currentRound": 1,
            "totalRounds": data[InviteCode]["RoundsNum"],
            "locations": data[InviteCode]["locations"],
            "guesses": {},
        }
        message = {"type": "game_started", "rounds": data[InviteCode]["RoundsNum"]}
        print(message)
        for _, ws in self.connections[InviteCode]:
            try:
                await ws.send_json(message)
            except Exception as e:
                print(f"Failed to send game_started to connection: {e}")
        logger.info(f"Game started for {InviteCode}")

    async def RoundStarted(self, InviteCode: str):
        currentRound = self.games[InviteCode]["currentRound"]
        locations_dict = self.games[InviteCode]["locations"]
        current_location = locations_dict[str(currentRound)]

        if currentRound > self.games[InviteCode]["totalRounds"]:
            return
        data = self.db.read()
        message = {
            "type": "round_started",
            "round": currentRound,
            "lat": current_location["lat"],
            "lon": current_location["lon"],
            "url": current_location["url"],
            "timer": data[InviteCode]["timer"],
            "RoundStartTime": int(time.time() * 1000),
        }
        self.games[InviteCode]["RoundStartTime"] = int(time.time() * 1000)
        for _, ws in self.connections[InviteCode]:
            try:
                await ws.send_json(message)
            except Exception as e:
                print(f"Failed to send round_started to connection: {e}")

        if InviteCode in self.timers:
            self.timers[InviteCode].cancel()

        task = asyncio.create_task(self.timer(InviteCode, data[InviteCode]["timer"]))
        self.timers[InviteCode] = task

        logger.info(f"Round {currentRound} started for {InviteCode}")

    async def RoundEnded(self, InviteCode: str):

        current_round = self.games[InviteCode]["currentRound"]

        if current_round not in self.games[InviteCode]["guesses"]:

            return

        locations_dict = self.games[InviteCode]["locations"]
        round_guesses = self.games[InviteCode]["guesses"][current_round]
        current_location = locations_dict[str(current_round)]

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

        for _, ws in self.connections[InviteCode]:
            try:
                await ws.send_json(message)
            except Exception as e:
                print(f"Failed to send round_ended to connection: {e}")

        self.games[InviteCode]["currentRound"] += 1
        logger.info(f"Round {current_round} ended for {InviteCode}")

    def user_rank_up(self, players: list):
        data = self.user_db.read()
        for login in players:

            if login not in data:
                continue

            cur_xp = data[login]["xp"]
            new_rank = "Ashborn"
            for xp_threshold, rank in reversed(RANKS):
                if cur_xp >= xp_threshold:
                    new_rank = rank
                    break
            data[login]["rank"] = new_rank
        self.user_db.write(data)
        logger.info(f"Ranks updated for {players}")

    async def GameEnded(self, InviteCode: str):
        all_guesses = self.games[InviteCode]["guesses"]

        total_distances = {}
        for round_num, guesses in all_guesses.items():
            for guess in guesses:
                player = guess["player"]
                if player not in total_distances:
                    total_distances[player] = 0
                total_distances[player] += guess["distance"]

        winner = min(total_distances, key=lambda x: total_distances[x])

        players = [
            self.user_GetInfo(player_login)
            for player_login, _ in self.connections[InviteCode]
        ]

        message = {
            "type": "game_ended",
            "winner": winner,
            "total_distances": total_distances,
            "players": players,
        }

        for _, ws in self.connections[InviteCode]:
            try:
                await ws.send_json(message)
            except Exception as e:
                print(f"Failed to send game_ended to connection: {e}")

        data_user = self.user_db.read()
        player_logins = [login for login, _ in self.connections[InviteCode]]

        old_ranks = {login: data_user[login]["rank"] for login in player_logins}

        for login in player_logins:
            data_user[login]["xp"] += 10

        data_user[winner]["xp"] += 50

        self.user_db.write(data_user)
        self.user_rank_up(player_logins)
        data_user = self.user_db.read()

        new_ranks = {login: data_user[login]["rank"] for login in player_logins}

        rank_ups = []

        for login in player_logins:
            if old_ranks[login] != new_ranks[login]:
                rank_ups.append(
                    {
                        "login": login,
                        "old_rank": old_ranks[login],
                        "new_rank": new_ranks[login],
                    }
                )

        if rank_ups:
            message_rank = {"type": "rank_up", "rank_ups": rank_ups}
            print(f"Sending rank_up event: {message_rank}")
            for _, ws in self.connections[InviteCode]:
                try:
                    await ws.send_json(message_rank)
                except Exception as e:
                    print(f"Failed to send rank_up to connection: {e}")

        lobby_data = self.db.read()
        del lobby_data[InviteCode]
        self.db.write(lobby_data)

        logger.info(f"Game ended for {InviteCode}")

    async def submitGuess(self, login: str, lobbycode: str, lat: float, lon: float):
        current_round = self.games[lobbycode]["currentRound"]
        locations_dict = self.games[lobbycode]["locations"]
        current_location = locations_dict[str(current_round)]
        lat_cur = current_location["lat"]
        lon_cur = current_location["lon"]
        distance = locat.haversine_m(lat, lon, lat_cur, lon_cur)

        if current_round not in self.games[lobbycode]["guesses"]:
            self.games[lobbycode]["guesses"][current_round] = []

        self.games[lobbycode]["guesses"][current_round].append(
            {"player": login, "distance": distance, "lat": lat, "lon": lon}
        )

        message = {"type": "player_guessed", "player": login}

        for _, ws in self.connections[lobbycode]:
            try:
                await ws.send_json(message)
            except Exception as e:
                print(f"Failed to send player_guessed to connection: {e}")

        if len(self.games[lobbycode]["guesses"][current_round]) == len(
            self.connections[lobbycode]
        ):

            await self.RoundEnded(lobbycode)
            if (
                self.games[lobbycode]["currentRound"]
                <= self.games[lobbycode]["totalRounds"]
            ):
                await asyncio.sleep(5)
                await self.RoundStarted(lobbycode)

            else:

                await self.GameEnded(lobbycode)

        data = self.user_db.read()

        if lobbycode in self.timers:
            self.timers[lobbycode].cancel()

        task = asyncio.create_task(self.timer(lobbycode, 40))
        self.timers[lobbycode] = task

        await self.broadcast(
            lobbycode,
            "system",
            {"type": "timer_short", "timer": 40, "time_stap": time.time()},
        )

        logger.info(f"Player {login} guessed for {lobbycode}")

    async def timer(self, lobbycode: str, time: int):
        await asyncio.sleep(time)
        await self.RoundEnded(lobbycode)
    
    async def reconect(self, login: str, inviteCode: str, ws: WebSocket):
        if inviteCode not in self.connections:
            raise HTTPException(status_code=404, detail="InviteCode not found")
        
        if inviteCode in self.disconnects and login in self.disconnects[inviteCode]:
            del self.disconnects[inviteCode][login]
        
        self.connections[inviteCode] = [(l, old_ws) for l, old_ws in self.connections[inviteCode] if l != login]
        self.connections[inviteCode].append((login, ws))
        
        data = self.db.read()

        message = {
            "type": "reconnect_succes",
            "host": data[inviteCode]["host"],
            "max_players": data[inviteCode]["max_players"],
            "total_rounds": data[inviteCode]["RoundsNum"],
            }
        if inviteCode in self.games:
            rounds = self.games[inviteCode]["currentRound"]
            current_location = self.games[inviteCode]["locations"][str(rounds)]

            message["game_state"] = {
                "current_round": rounds,
                "total_rounds": data[inviteCode]["RoundsNum"],
                "locations": {
                    "lat": current_location["lat"],
                    "lon": current_location["lon"],
                    "url": current_location["url"],
                },
                "roundstart_time": self.games[inviteCode]["RoundStartTime"],
                "timer": data[inviteCode]["timer"],
            }

            current_round = self.games[inviteCode]["currentRound"]
            if current_round in self.games[inviteCode]["guesses"]:
                player_has_guessed = any(g["player"] == login for g in self.games[inviteCode]["guesses"][current_round])
                message["game_state"]["PlayerHasGuessed"] = player_has_guessed
                message["game_state"]["player_guess"] = [g["player"] for g in self.games[inviteCode]["guesses"][current_round]]
        

        message["players"] = [
            self.user_GetInfo(login) for login, _ in self.connections[inviteCode]]
        
        await ws.send_json(message)
        

        for login_p, ws_p in self.connections[inviteCode]:
            if login_p != login:
                try:
                    await ws_p.send_json({"type": "player_reconnected", "player": login})
                except Exception as e:
                    print(f"Failed to send player_reconnected to {login_p}: {e}")

        logger.info(f"Player {login} reconnected to {inviteCode}")

ws_service = Websocket_service()