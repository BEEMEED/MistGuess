from aiogram import Dispatcher, Bot
from aiogram.fsm.storage.memory import MemoryStorage
from config import Config
from handlers.start import router as start_handler
from handlers.inline import router as inline_handler
import asyncio

TELEGRAM_TOKEN = Config.BOT_TOKEN
if not TELEGRAM_TOKEN:
    raise ValueError("TELEGRAM_TOKEN not found in environment variables")

bot = Bot(token=TELEGRAM_TOKEN)
storage = MemoryStorage()
dp = Dispatcher(storage=storage)

dp.include_router(start_handler)
dp.include_router(inline_handler)

async def main():
    print("bot is starting")
    await dp.start_polling(bot, allowed_updates=["message", "callback_query", "inline_query"])

if __name__ == '__main__':
    asyncio.run(main())