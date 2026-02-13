import pytest
import io


@pytest.mark.asyncio
async def test_get_current_user_profile(client, regular_user):
    client.cookies.set("access_token", regular_user["token"])
    response = await client.get("/profile/me")
    assert response.status_code == 200
    assert response.json()["name"] == regular_user["user"].name


@pytest.mark.asyncio
async def test_update_username_valid(client, regular_user):
    client.cookies.set("access_token", regular_user["token"])
    response = await client.patch("/profile/", json={"new_name": "new_username"})
    assert response.status_code == 200
    assert response.json()["name"] == "new_username"


@pytest.mark.asyncio
async def test_upload_avatar_png(client, regular_user):
    client.cookies.set("access_token", regular_user["token"])
    fake_image = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
    response = await client.put(
        "/profile/avatar",
        files={"file": ("avatar.png", fake_image, "image/png")}
    )
    assert response.status_code == 200
    assert "avatar" in response.json()

@pytest.mark.asyncio
async def test_get_avatar(client, regular_user, redis_client):
    client.cookies.set("access_token", regular_user["token"])
    response = await client.get("/profile/avatar")
    assert response.status_code == 200
    assert isinstance(response.json(), str)

@pytest.mark.asyncio
async def test_get_leaderboard(client, redis_client):
    response = await client.get("/profile/leaderboard")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
