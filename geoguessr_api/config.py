import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Config:
    BASE_DIR = Path(__file__).resolve().parent

    SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret-key-in-production")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")

    CLIENT_ID = os.getenv("CLIENT_ID")
    CLIENT_SECRET = os.getenv("CLIENT_SECRET")
    REDIRECT_URI = os.getenv(
        "REDIRECT_URI", "http://localhost:5173/auth/google/callback"
    )
    DATABASE_URL: str = os.getenv("SQLALCHEMY_DATABASE_URL") or ""
    if not DATABASE_URL:
        raise ValueError("set SQLALCHEMY_DATABASE_URL in env")

    TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")

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


config = Config()
