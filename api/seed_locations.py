import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database.database import asyncsession
from models.locations import Locations

LOCATIONS = [
    # Europe
    {"lat": 48.8566, "lon": 2.3522, "region": "Europe", "country": "France"},
    {"lat": 51.5074, "lon": -0.1278, "region": "Europe", "country": "United Kingdom"},
    {"lat": 52.5200, "lon": 13.4050, "region": "Europe", "country": "Germany"},
    {"lat": 41.9028, "lon": 12.4964, "region": "Europe", "country": "Italy"},
    {"lat": 40.4168, "lon": -3.7038, "region": "Europe", "country": "Spain"},
    {"lat": 59.9139, "lon": 10.7522, "region": "Europe", "country": "Norway"},
    {"lat": 55.6761, "lon": 12.5683, "region": "Europe", "country": "Denmark"},
    {"lat": 60.1699, "lon": 24.9384, "region": "Europe", "country": "Finland"},
    {"lat": 59.4370, "lon": 24.7536, "region": "Europe", "country": "Estonia"},
    {"lat": 47.3769, "lon": 8.5417, "region": "Europe", "country": "Switzerland"},
    {"lat": 48.2082, "lon": 16.3738, "region": "Europe", "country": "Austria"},
    {"lat": 50.0755, "lon": 14.4378, "region": "Europe", "country": "Czech Republic"},
    {"lat": 52.2297, "lon": 21.0122, "region": "Europe", "country": "Poland"},
    {"lat": 47.4979, "lon": 19.0402, "region": "Europe", "country": "Hungary"},
    {"lat": 44.8176, "lon": 20.4633, "region": "Europe", "country": "Serbia"},
    {"lat": 37.9838, "lon": 23.7275, "region": "Europe", "country": "Greece"},
    {"lat": 38.7223, "lon": -9.1393, "region": "Europe", "country": "Portugal"},
    {"lat": 59.3293, "lon": 18.0686, "region": "Europe", "country": "Sweden"},
    {"lat": 53.3498, "lon": -6.2603, "region": "Europe", "country": "Ireland"},
    {"lat": 50.8503, "lon": 4.3517, "region": "Europe", "country": "Belgium"},

    # Asia
    {"lat": 35.6762, "lon": 139.6503, "region": "Asia", "country": "Japan"},
    {"lat": 37.5665, "lon": 126.9780, "region": "Asia", "country": "South Korea"},
    {"lat": 39.9042, "lon": 116.4074, "region": "Asia", "country": "China"},
    {"lat": 1.3521, "lon": 103.8198, "region": "Asia", "country": "Singapore"},
    {"lat": 13.7563, "lon": 100.5018, "region": "Asia", "country": "Thailand"},
    {"lat": 21.0285, "lon": 105.8542, "region": "Asia", "country": "Vietnam"},
    {"lat": 28.6139, "lon": 77.2090, "region": "Asia", "country": "India"},
    {"lat": 31.5497, "lon": 74.3436, "region": "Asia", "country": "Pakistan"},
    {"lat": 3.1390, "lon": 101.6869, "region": "Asia", "country": "Malaysia"},
    {"lat": -6.2088, "lon": 106.8456, "region": "Asia", "country": "Indonesia"},
    {"lat": 14.5995, "lon": 120.9842, "region": "Asia", "country": "Philippines"},
    {"lat": 27.4716, "lon": 89.6386, "region": "Asia", "country": "Bhutan"},
    {"lat": 33.8869, "lon": 9.5375, "region": "Asia", "country": "Tunisia"},
    {"lat": 25.2048, "lon": 55.2708, "region": "Asia", "country": "UAE"},
    {"lat": 41.2995, "lon": 69.2401, "region": "Asia", "country": "Uzbekistan"},

    # Americas
    {"lat": 40.7128, "lon": -74.0060, "region": "Americas", "country": "USA"},
    {"lat": 34.0522, "lon": -118.2437, "region": "Americas", "country": "USA"},
    {"lat": 41.8781, "lon": -87.6298, "region": "Americas", "country": "USA"},
    {"lat": 29.7604, "lon": -95.3698, "region": "Americas", "country": "USA"},
    {"lat": 47.6062, "lon": -122.3321, "region": "Americas", "country": "USA"},
    {"lat": 45.5017, "lon": -73.5673, "region": "Americas", "country": "Canada"},
    {"lat": 43.6532, "lon": -79.3832, "region": "Americas", "country": "Canada"},
    {"lat": 49.2827, "lon": -123.1207, "region": "Americas", "country": "Canada"},
    {"lat": -23.5505, "lon": -46.6333, "region": "Americas", "country": "Brazil"},
    {"lat": -22.9068, "lon": -43.1729, "region": "Americas", "country": "Brazil"},
    {"lat": -34.6037, "lon": -58.3816, "region": "Americas", "country": "Argentina"},
    {"lat": -33.4489, "lon": -70.6693, "region": "Americas", "country": "Chile"},
    {"lat": -12.0464, "lon": -77.0428, "region": "Americas", "country": "Peru"},
    {"lat": 4.7110, "lon": -74.0721, "region": "Americas", "country": "Colombia"},
    {"lat": 19.4326, "lon": -99.1332, "region": "Americas", "country": "Mexico"},

    # Africa
    {"lat": -33.9249, "lon": 18.4241, "region": "Africa", "country": "South Africa"},
    {"lat": -26.3054, "lon": 31.1367, "region": "Africa", "country": "Eswatini"},
    {"lat": 30.0444, "lon": 31.2357, "region": "Africa", "country": "Egypt"},
    {"lat": 6.3703, "lon": 2.3912, "region": "Africa", "country": "Benin"},
    {"lat": -1.2921, "lon": 36.8219, "region": "Africa", "country": "Kenya"},
    {"lat": -25.9692, "lon": 32.5732, "region": "Africa", "country": "Mozambique"},
    {"lat": 14.6928, "lon": -17.4467, "region": "Africa", "country": "Senegal"},
    {"lat": 5.3600, "lon": -4.0083, "region": "Africa", "country": "Ivory Coast"},
    {"lat": -18.9249, "lon": 47.5185, "region": "Africa", "country": "Madagascar"},
    {"lat": -1.9441, "lon": 30.0619, "region": "Africa", "country": "Rwanda"},

    # Oceania
    {"lat": -33.8688, "lon": 151.2093, "region": "Oceania", "country": "Australia"},
    {"lat": -37.8136, "lon": 144.9631, "region": "Oceania", "country": "Australia"},
    {"lat": -27.4698, "lon": 153.0251, "region": "Oceania", "country": "Australia"},
    {"lat": -36.8485, "lon": 174.7633, "region": "Oceania", "country": "New Zealand"},
    {"lat": -41.2866, "lon": 174.7756, "region": "Oceania", "country": "New Zealand"},
    {"lat": -17.7333, "lon": 168.3273, "region": "Oceania", "country": "Vanuatu"},

    # Russia / CIS
    {"lat": 55.7558, "lon": 37.6173, "region": "Russia", "country": "Russia"},
    {"lat": 59.9311, "lon": 30.3609, "region": "Russia", "country": "Russia"},
    {"lat": 56.8389, "lon": 60.6057, "region": "Russia", "country": "Russia"},
    {"lat": 53.9045, "lon": 27.5615, "region": "Russia", "country": "Belarus"},
    {"lat": 50.4501, "lon": 30.5234, "region": "Russia", "country": "Ukraine"},
    {"lat": 51.1801, "lon": 71.4460, "region": "Asia", "country": "Kazakhstan"},
]


async def seed():
    async with asyncsession() as db:
        for loc in LOCATIONS:
            obj = Locations(**loc)
            db.add(obj)
        await db.commit()
    print(f"Seeded {len(LOCATIONS)} locations.")


if __name__ == "__main__":
    asyncio.run(seed())
