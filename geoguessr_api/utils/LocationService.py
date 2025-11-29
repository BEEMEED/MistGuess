from .bd_service import DataBase
from config import config

import math
import random


class LocationService:
    def __init__(self) -> None:
        self.bd = DataBase(config.DB_LOCATIONS)

    def GetRandomLocation(self, NumRounds: int):
        data = self.bd.read()
        locations_list = list(data.values())

        if NumRounds > len(locations_list):
            NumRounds = len(locations_list)

        if NumRounds <= 0 or len(locations_list) == 0:
            return {}

        selected_locations = random.sample(locations_list, NumRounds)
        result = {}
        for round_num, location in enumerate(selected_locations, start=1):
            lat = location["lat"]
            lon = location["lon"]

            url = f"https://www.google.com/maps/@{lat},{lon},17z"

            result[round_num] = {"lat": lat, "lon": lon, "url": url}
        return result

    @staticmethod
    def haversine_m(lat1, lon1, lat2, lon2):
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = (
            math.sin(dphi / 2) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return 6371000 * c
