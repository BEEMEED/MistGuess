from config import config
from repositories.location_repository import LocationRepository
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.user_repository import UserRepository
from repositories.lobby_repository import LobbyRepository
from repositories.location_repository import LocationRepository
import math
import random


class LocationService:
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

    @staticmethod
    def generate_street_view_url(lat: float, lon: float):
        return (
            f"https://www.google.com/maps/@?api=1&map_action=pano&viewpoint={lat},{lon}"
        )
    
    @staticmethod
    async def calculate_points(distance: float):
        import math

        distance_km = distance / 1000
        points = 5000 * math.pow(0.998036, distance_km)
        return int(round(points))
