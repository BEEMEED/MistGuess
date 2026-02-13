import pytest
from models.user import User
from utils.token_manager import TokenManager


@pytest.mark.asyncio
async def test_create_lobby_success(client, regular_user, redis_client):
    client.cookies.set("access_token", regular_user["token"])
    response = await client.post("/lobbies/")
    assert response.status_code == 200
    assert "invite_code" in response.json()


@pytest.mark.asyncio
async def test_join_lobby_valid_code(client, db_session, lobby, redis_client):
    user2 = User(username="player2", google_id="1234", name="player2")
    db_session.add(user2)
    await db_session.commit()
    await db_session.refresh(user2)

    token2 = TokenManager.create_access_token({"id": user2.id})

    client.cookies.set("access_token", token2)
    response = await client.put(f"/lobbies/{lobby.invite_code}/members")
    assert response.status_code == 200
    assert "message" in response.json()


@pytest.mark.asyncio
async def test_leave_lobby_as_member(client, regular_user, lobby):
    client.cookies.set("access_token", regular_user["token"])
    response = await client.delete(f"/lobbies/{lobby.invite_code}/members")
    assert response.status_code == 200
    assert "message" in response.json()
