from utils.dependencies import Dependies
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import get_db
from models.user import User
router = APIRouter()
dependies = Dependies()
@router.get("/{telegram_id}/stats")
async def get_telegram_stats(
    telegram_id: str,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(dependies.verify_bot_secret)
):
    user = await db.execute(
        select(User).where(User.telegram == telegram_id)
    )
    user = user.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "name": user.name,
        "username": user.username,
        "avatar": user.avatar,
        "rank": user.rank,
        "xp": user.xp,
        "games_played": user.games_played,
        "games_won": user.games_won,
        "games_lost": user.games_lost,
    }
