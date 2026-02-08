import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Config:
    BASE_DIR = Path(__file__).resolve().parent

    SECRET_KEY = os.getenv("SECRET_KEY", "your_secret_key")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")

    CLIENT_ID = os.getenv("CLIENT_ID")
    CLIENT_SECRET = os.getenv("CLIENT_SECRET")
    REDIRECT_URI = os.getenv("REDIRECT_URI")

    DATABASE_URL = os.getenv("DATABASE_URL")

    GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
    GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"

    TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
    TELEGRAM_BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME")

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

    CLAN_RANKS = [
    (0,    "Circle"),
    (500,  "Cohort"),
    (1500, "Order"),
    (3000, "Covenant"),
    (6000, "Dominion"),
    (10000,"Conclave"),
    (16000,"Ascendancy"),
]


    DSN = os.getenv("DSN")

    BOT_SECRET = os.getenv("BOT_SECRET")


config = Config()
