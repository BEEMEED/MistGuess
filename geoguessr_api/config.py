import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

class Config:
    BASE_DIR = Path(__file__).resolve().parent
    DB_DIR = BASE_DIR / "bd"

    DB_USERS = os.getenv("DB_USERS_PATH", str(DB_DIR / "bd_users.json"))
    DB_LOBBY = os.getenv("DB_LOBBY_PATH", str(DB_DIR / "bd_lobby.json"))
    DB_LOCATIONS = os.getenv("DB_LOCATIONS_PATH", str(DB_DIR / "locations.json"))

    SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret-key-in-production")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")

    CLIENT_ID = os.getenv("CLIENT_ID")
    CLIENT_SECRET = os.getenv("CLIENT_SECRET")
    REDIRECT_URI = os.getenv("REDIRECT_URI", "http://localhost:5173/auth/google/callback")

    TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")

config = Config()
