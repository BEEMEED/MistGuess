import pytest
from repositories.user_repository import UserRepository
from services.authorization import TokenManager
from tests.test_lobbies import test_user


@pytest.fixture
async def admin_user(db_session):
    user = await UserRepository.create(db_session,google_id="12333",username="test")
    user = await UserRepository.update(db_session, user.id, {"role": "admin"})
    await db_session.commit()
    if not user:
        return
    token = TokenManager.create_token({"id": user.id})
    return {"user": user, "token": token}

@pytest.mark.asyncio
async def test_admin_panel(client,admin_user):
    client.cookies.set("access_token", admin_user["token"])
    response = await client.get("/admin")
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_create_location(client,admin_user):
    client.cookies.set("access_token", admin_user["token"])
    response = await client.post("/admin/locations",json={"lat": -90,"lon": -180,"region": "africa"})
    assert response.status_code == 200
    return response.json()["location_id"]

@pytest.mark.asyncio
async def test_delete_location(client,admin_user,test_create_location):
    client.cookies.set("access_token", admin_user["token"])
    response = await client.delete("/admin/locations/{location_id}",json={"location_id": test_create_location})
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_ban_user(client,admin_user,test_user):
    client.cookies.set("acess_token", admin_user["token"])
    user_id = test_user["id"]
    response = await client.delete("/admin/users/{user_id}/ban",json={"reason":"test"})
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_update_user_role(client,admin_user,test_user):
    client.cookies.set("acess_token", admin_user["token"])
    user_id = test_user["id"]
    response = await client.patch("/admin/users/{user_id}/role",json={})
    assert response.status_code == 200

