from aiogram.types import InlineQuery, InlineQueryResultArticle, InputTextMessageContent
from aiogram import Router
import hashlib
import aiohttp

router = Router()


@router.inline_query()
async def inline_query_handler(inline_query: InlineQuery):
    text = inline_query.query.strip().lower()
    results = []

    if not text or any(cmd.startswith(text) for cmd in ["leaderboard", "лидерборд", "топ"]):
        leaderboard_content = "Не удалось получить данные 😔"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get("http://api:8000/profile/leaderboard", timeout=aiohttp.ClientTimeout(total=2)) as response:
                    if response.status == 200:
                        data = await response.json()
                        lines = ["🏆 <b>Leaderboard</b>\n"]
                        for i, user in enumerate(data[:10], 1):
                            medal = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else f"{i}."
                            lines.append(f"{medal} {user['name']} - {user['xp']} XP")
                        leaderboard_content = "\n".join(lines)
        except Exception:
            pass

        results.append(
            InlineQueryResultArticle(
                id=hashlib.md5("leaderboard".encode()).hexdigest(),
                title="🏆 Leaderboard",
                description="Показать топ 10 игроков",
                input_message_content=InputTextMessageContent(
                    message_text=leaderboard_content,
                    parse_mode="HTML"
                ),
            )
        )

    if not text or any(cmd.startswith(text) for cmd in ["help", "помощь"]):
        results.append(
            InlineQueryResultArticle(
                id=hashlib.md5("help".encode()).hexdigest(),
                title="ℹ️ Help",
                description="Как пользоваться ботом",
                input_message_content=InputTextMessageContent(
                    message_text="<b>Доступные команды:</b>\n\n• Напишите <code>топ</code> или выберите из списка, чтобы увидеть рейтинг.",
                    parse_mode="HTML"
                ),
            )
        )

    await inline_query.answer(results=results, cache_time=5, is_personal=True)