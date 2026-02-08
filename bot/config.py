import os

class Config:
    BOT_TOKEN = os.getenv("BOT_TOKEN", "yoru_bot_token")
    BOT_SECRET = os.getenv("BOT_SECRET", "your_bot_secret")