from aiogram import Router, Bot
from aiogram.types import Message
from aiogram.filters import Command, CommandObject
import aiohttp
from aio_pika import connect_robust, message as rabbitmessage
import json
bot = Bot(token="8080588209:AAHWhfYsfOesAnSgDZlCRFdz6bAVx9Zce44")
router = Router(name="notification")

async def on_message(message):
    async with message.process():
        data = json.loads(message.body.decode())
        telegram_id = data.get("telegramID")
        text = data.get("text")

        if telegram_id and text:
            await bot.send_message(chat_id=telegram_id, text=text)

async def start_consum():
    rabbitmq_host = "rabbitmq" 
    connection = await connect_robust(f"amqp://{rabbitmq_host}/")
    channel = await connection.channel()
    queue = await channel.declare_queue("telegram_notification", durable=True)
    await queue.consume(on_message)

@router.message(Command("start"))
async def start(msg: Message):
    await msg.reply(
        "Привет! для привязки аккаунта\nВведите /link code\nкод можно получить на сайте mistguess.com"
    )



@router.message(Command("link"))
async def verify(msg: Message, command: CommandObject):
    if not command.args:
        msg.reply("❌ Использование: /link code")
        return
    code = command.args.strip()
    if msg.from_user:
        telegram_id = msg.from_user.id

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "http://api:8000/telegram/auth/callback",
                    json={"telegramID": str(telegram_id), "code": str(code)},
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        await msg.reply("✅ Аккаунт привязан")
                        
                        
                    else:
                        await msg.reply("❌ Не удалось привязать аккаунт")
        except Exception as e:
            await msg.reply(f"❌ ошибка: {e}")
    return



