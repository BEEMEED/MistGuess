from utils.bd_service import DataBase
from config import config
from fastapi import HTTPException, APIRouter, Body, Depends
from services.authorization import AuthService
from utils.LocationService import LocationService
import secrets
import logging
from utils.dependencies import get_invite_code

logger = logging.getLogger(__name__)

loc = LocationService()


class LobbyService:
    def __init__(self) -> None:
        self.bd = DataBase(config.DB_LOBBY)

    def create_lobby(self, login: str, max_players: int, rounds: int, timer: int) -> dict:
        data = self.bd.read()
        InviteCode = secrets.token_urlsafe(6)
        data[InviteCode] = {
            "host": login,
            "max_players": max_players,
            "users": [login],
            "InviteCode": InviteCode,
            "RoundsNum": rounds,
            "locations": loc.GetRandomLocation(rounds),
            "timer": timer
        }
        self.bd.write(data)
        logging.info(f"User {login} created lobby {InviteCode}")
        return {"InviteCode": InviteCode}
        

    def lobby_join(self, InviteCode: str, login: str):
        data = self.bd.read()
        
        if len(data[InviteCode]["users"]) >= data[InviteCode]["max_players"]:
            raise HTTPException(status_code=409, detail="LOBBY_FULL")

        data[InviteCode]["users"].append(login)
        self.bd.write(data)

        logging.info(f"User {login} joined lobby {InviteCode}")
        return {"message": "Successfully joined lobby"}
    
        

    def lobby_leave(self, InviteCode: str, login: str):
        data = self.bd.read()

        if login not in data[InviteCode]["users"]:
            raise HTTPException(status_code=409, detail="ALREADY_LEAVE_LOBBY")
        
        data[InviteCode]["users"].remove(login)
        self.bd.write(data)

        logging.info(f"User {login} left lobby {InviteCode}")
        return {"message": "Successfully left lobby"}

        






