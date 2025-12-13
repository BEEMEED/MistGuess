import pytest
from repositories.user_repository import UserRepository
from services.authorization import TokenManager



@pytest.fixture
async def test_user(db_session):
    user = await UserRepository.create(db_session,google_id="12333",username="test")
    await db_session.commit()
    token = TokenManager.create_token({"id": user.id})
    return {"user": user, "token": token}

@pytest.mark.asyncio
async def test_name(client,test_user):
    client.cookies.set("access_token", test_user["token"])
    response = await client.patch("/profile",json={"new_name": "test2"})
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_get_me(client,test_user):
    client.cookies.set("access_token", test_user["token"])
    response = await client.get("/profile/me")
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_get_avatar(client,test_user):
    client.cookies.set("access_token", test_user["token"])
    response = await client.get("/profile/avatar")
    assert response.status_code == 200