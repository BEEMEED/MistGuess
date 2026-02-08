from aiogram import Router, Bot, F
from aiogram.types import Message, InlineKeyboardButton, InlineKeyboardMarkup, CallbackQuery, FSInputFile
from aiogram.filters import Command, CommandObject
import aiohttp
from cache.redis import r
import json
from config import Config
bot = Bot(token=Config.BOT_TOKEN)
router = Router(name="notification")

@router.message(Command('start'))
async def start_handler(message: Message):
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🎮 Play Now", url="https://mistguess.com")],
        [
            InlineKeyboardButton(text="📊 My Stats", callback_data="stats"),
            InlineKeyboardButton(text="🏆 Leaderboard", callback_data="leaderboard")
        ],
        [InlineKeyboardButton(text="🔗 Link Account",callback_data="link")]
    ])

    text = (
    "🌍 <b>Welcome to MistGuess!</b>\n\n"
        "Compete against players worldwide in real-time geography battles!\n\n"
        "<b>Features:</b>\n"
        "• 🎯 Real-time multiplayer matches\n"
        "• ⚔️ HP-based combat system\n"
        "• 📈 XP progression | ranks\n"
        "• 🔔 Game notifications\n\n"
        "<i>Link your account to receive notifications and track your stats!</i>"
    )

    if message is None:
        return
    await message.reply(text, reply_markup=keyboard, parse_mode="HTML")

@router.message(Command('stats'))
@router.callback_query(F.data == "stats")
async def stats(message: Message | None = None, callback_query: CallbackQuery | None = None):
    assert message
    assert message.from_user
    if message:
        user_id = message.from_user.id
    else:
        assert callback_query
        assert callback_query.from_user
        user_id = callback_query.from_user.id
        await callback_query.answer()

    async with aiohttp.ClientSession() as session:
        
        header = {
            "bot_secret": Config.BOT_SECRET,
        }
        
        response = await session.get(f"http://api:8000/{user_id}/leaderboard", headers=header)
        
        if response.status == 404:
            text = "❌ Account not linked. Use /start and click 'Link Account'"
            
            if callback_query:
                assert callback_query.message
                await callback_query.message.answer(text)
            else:
                await message.reply(text)
            return
            
        elif response.status != 200:
            text = "❌ Error fetching stats"
            
            if callback_query:
                assert callback_query.message
                await callback_query.message.answer(text)
            else:
                await message.reply(text)
            return
        
        data = await response.json()
        winrate = (data["games_won"] / data["games_played"] * 100) if data["games_played"] > 0 else 0
        
        text = (
            f"📊 <b>Stats: {data['name']}</b>\n\n"
            f"├ Username: {data['username']}\n"
            f"├ Rank: {data['rank']}\n"
            f"├ XP: {data['xp']}\n"
            f"├ Games: {data['games_played']} ({data['games_won']}W / {data['games_lost']}L)\n"
            f"└ Win Rate: {winrate:.1f}%"
        )

        avatar = data.get("avatar")

        if callback_query:
            assert callback_query.message
            if avatar:
                photo = FSInputFile(avatar)
                await callback_query.message.answer_photo(photo=photo, caption=text, parse_mode="HTML")
            else:
                await callback_query.message.answer(text, parse_mode="HTML")
        else:
            if avatar:
                photo = FSInputFile(avatar)
                await message.reply_photo(photo=photo, caption=text, parse_mode="HTML")
            else:
                await message.reply(text, parse_mode="HTML")
@router.message(Command('leaderboard'))
@router.callback_query(F.data == "leaderboard")
async def leaderboard(query: CallbackQuery | None = None, message: Message | None = None):    
    async with aiohttp.ClientSession() as session:
        response = await session.get("http://api:8000/leaderboard")
        users = await response.json()
    text = "🏆 <b>Leaderboard</b>\n\n"
    for i, user in enumerate(users, 1):
        text += f"{i}. {user['username']} - {user['xp']} XP\n"
    if query:
        assert query.message
        await query.answer()
        await query.message.answer(text, parse_mode="HTML")
    else:
        assert message
        await message.reply(text, parse_mode="HTML")