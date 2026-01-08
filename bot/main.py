from aiogram import Dispatcher, Bot
from aiogram.fsm.storage.memory import MemoryStorage
import asyncio
import os
from dotenv import load_dotenv

from handlers.notification_handler import router as register_handlers, start_consum

load_dotenv()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
if not TELEGRAM_TOKEN:
    raise ValueError("TELEGRAM_TOKEN not found in environment variables")

bot = Bot(token=TELEGRAM_TOKEN)
storage = MemoryStorage()
dp = Dispatcher(storage=storage)

dp.include_router(register_handlers)

async def main():
    print("бот запущен.")
    asyncio.create_task(start_consum())
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())