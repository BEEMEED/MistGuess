import pytest
from repositories.user_repository import UserRepository
from services.authorization import TokenManager



@pytest.fixture
async def test_user(db_session):
    user = await UserRepository.create(db_session,google_id="12333",username="test")
    await db_session.commit()
    token = TokenManager.create_token({"id": user.id})
    return {"user": user, "token": token}

@pytest.fixture
async def created_lobby(client,test_user):
    client.cookies.set("access_token", test_user["token"])
    response = await client.post("/lobbies",json={})
    return response.json()["invite_code"]

@pytest.mark.asyncio
async def test_create_lobby(client,test_user):
    client.cookies.set("access_token", test_user["token"])
    response = await client.post("/lobbies",json={})
    assert response.status_code == 200
    assert "invite_code" in response.json()

@pytest.mark.asyncio
async def test_join_lobby(client,db_session,created_lobby):
    user2 = await UserRepository.create(db_session,google_id="12334",username="test2")
    await db_session.commit()
    token2 = TokenManager.create_token({"id": user2.id})

    client.cookies.set("access_token", token2)
    response = await client.put(f"/lobbies/{created_lobby}/members",json={"invite_code": created_lobby})
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_leave_lobby(client,db_session, created_lobby):
    user = await UserRepository.create(db_session,google_id="12335",username="test3")
    await db_session.commit()
    token = TokenManager.create_token({"id": user.id})

    client.cookies.set("access_token", token)

    response = await client.delete(f"/lobbies/{created_lobby}/members",json={"invite_code": created_lobby})
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_get_random(client, test_user):
    client.cookies.set("access_token", test_user["token"])
    response = await client.get("/lobbies/random")
    assert response.status_code == 200