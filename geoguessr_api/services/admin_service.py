from fastapi import HTTPException
from services.authorization import AuthService
from utils.bd_service import DataBase
from config import config
import logging
import json
from pika import BlockingConnection, ConnectionParameters

auth = AuthService
logger = logging.getLogger(__name__)


class Admin_Panel:
    def __init__(self):
        self.user_db = DataBase(config.DB_USERS)
        self.lobby_db = DataBase(config.DB_LOBBY)
        self.location_db = DataBase(config.DB_LOCATIONS)

    def Add_Location(self, admin_login: str, lat: float, lon: float, region: str):
        data = self.location_db.read()
        data[len(data) + 1] = {"lat": lat, "lon": lon, "region": region}
        self.location_db.write(data)

        logger.info(
            f"{admin_login} added location lat {lat}, lon {lon}, region {region}"
        )

    def Get_Panel_Admin(self, limit: int, page: int):
        start = (page - 1) * limit
        end = start + limit

        data_user = self.user_db.read()
        data_lobby = self.lobby_db.read()
        data_location = self.location_db.read()
        return {
            "data_user": list(data_user.items())[start:end],
            "data_lobby": list(data_lobby.items())[start:end],
            "data_location": list(data_location.items())[start:end],
            "total_users": len(data_user),
            "total_lobbies": len(data_lobby),
            "total_locations": len(data_location),
            "page": page,
            "limit": limit,
        }

    def Change_Location(
        self, admin_login: str, lat_new: float, lon_new: float, region_new: str, id: int
    ):
        data = self.location_db.read()
        lat_old, lon_old, region_old = (
            data[id]["lat"],
            data[id]["lon"],
            data[id]["region"],
        )
        region = region_new if region_new != "" else region_old
        lat = lat_new if lat_new != 0 else lat_old
        lon = lon_new if lon_new != 0 else lon_old
        data[id] = {"lat": lat, "lon": lon, "region": region}
        self.location_db.write(data)

        logger.warning(
            f"Admin {admin_login} changed location {id} from lat {lat_old}, lon {lon_old}, region {region_old} to lat {lat},lon {lon},region {region}"
        )

    def Delete_Location(self, admin_login: str, id: int):
        data = self.location_db.read()
        del data[id]
        self.location_db.write(data)

        logging.warning(f"Admin deleted location {id}")

    async def Ban_User(self, admin_login: str, login: str, reason: str):
        data = self.user_db.read()

        if login not in data:
            raise HTTPException(status_code=404, detail="User not found")
        
        telegramID = data[login]["telegram"]

        del data[login]
        self.user_db.write(data)

        if telegramID and telegramID != "":

            connection = BlockingConnection(ConnectionParameters("localhost"))
            chanel = connection.channel()

            message_send = {
                "telegramID": telegramID,
                "text": f"Вы были забанены админом {data[admin_login]["name"]} по причине: {reason}",
            }
            chanel.basic_publish(
                routing_key="telegram_notification",
                body=json.dumps(message_send),
                exchange="",
            )

        logging.warning(f"Admin {admin_login} banned user {login} for {reason}")

    def send_message_telegram(self, admin_login: str, message: str, login: str):
        data = self.user_db.read()

        if login not in data:
            raise HTTPException(status_code=404, detail="User not found")
        telegramID = data[login]["telegram"]

        if telegramID and telegramID != "":
            connection = BlockingConnection(ConnectionParameters("localhost"))
            chanel = connection.channel()

            message_send = {
                "telegramID": telegramID,
                "text": f"⚠️новое сообщение от администратора\n{data[admin_login]["name"]}: {message}",
            }
            chanel.basic_publish(
                routing_key="telegram_notification",
                body=json.dumps(message_send),
                exchange="",
            )
        logging.info(f"Admin {admin_login} sent message to user {login}: {message}")

    def Change_Role(self, admin_login: str, login: str):
        data = self.user_db.read()
        if login not in data:
            raise HTTPException(status_code=404, detail="User not found")
        if data[login]["role"] == "admin":
            raise HTTPException(status_code=409, detail="User is already admin")
        data[login]["role"] = "admin"
        self.user_db.write(data)

        logging.warning(f"Admin {admin_login} changed role of user {login} to admin")
