import pytest
from repositories.user_repository import UserRepository
from services.authorization import TokenManager

@pytest.mark.asyncio
async def test_get_admin_panel_with_pagination(client, regular_user_admin):
    client.cookies.set("access_token", regular_user_admin["token"])
    response = await client.get("/admin/?limit=10&page=1")
    assert response.status_code == 200
    assert "data_user" in response.json()
    assert "data_lobby" in response.json()
    assert "data_location" in response.json()

@pytest.mark.asyncio
async def test_create_location_valid_coords(client, regular_user_admin):
    client.cookies.set("access_token", regular_user_admin["token"])
    response = await client.post("/admin/locations",json={"lat": 48.8566, "lon": 2.3522, "region": "europe", "country":"Russia"})
    assert response.status_code == 200
    assert "location_id" in response.json()

@pytest.mark.asyncio
async def test_update_location_as_admin(client, regular_user_admin, Location):
    client.cookies.set("access_token", regular_user_admin["token"])
    response = await client.patch(f"/admin/locations/{Location.id}", json={"region": "eust"})
    assert response.status_code == 200
    assert "lat" in response.json()

@pytest.mark.asyncio
async def test_delete_location_as_admin(client, regular_user_admin, Location):
    client.cookies.set("access_token", regular_user_admin["token"])
    response = await client.delete(f"/admin/locations/{Location.id}")
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_ban_user_with_reason(client, regular_user_admin, regular_user, redis_client):
    client.cookies.set("access_token", regular_user_admin["token"])
    response = await client.request("DELETE", f"/admin/users/{regular_user['user'].id}/ban", json={"reason": "test"})
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_update_user_role_to_admin(client, regular_user_admin, regular_user):
    client.cookies.set("access_token", regular_user_admin["token"])
    response = await client.patch(f"/admin/users/{regular_user['user'].id}/role", json={"role": "admin"})
    assert response.status_code == 200