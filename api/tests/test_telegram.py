import pytest
from models.user import User
from config import config


@pytest.mark.asyncio
async def test_get_telegram_user_stats(client, db_session, monkeypatch):
    monkeypatch.setattr(config, "BOT_SECRET", "test_secret")

    user = User(username="tguser", google_id="tg_google_id", name="TG User", telegram="test_tg_id")
    db_session.add(user)
    await db_session.commit()

    response = await client.get(
        "/telegram/test_tg_id/stats",
        headers={"bot-secret": "test_secret"},
    )
    assert response.status_code == 200
    assert "name" in response.json()
