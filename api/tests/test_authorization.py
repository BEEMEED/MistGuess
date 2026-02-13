import pytest


@pytest.mark.asyncio
async def test_get_google_auth_url(client):
    response = await client.get("/auth/google")
    assert response.status_code == 200
    assert "auth_url" in response.json()

@pytest.mark.asyncio
async def test_google_login_new_user(client, mock_google_oauth, db_session):
    response = await client.post("/auth/google/callback", json={"code": "test_code"})
    assert response.status_code == 200
    assert "user_id" in response.json()

@pytest.mark.asyncio
async def test_google_login_existing_user(client, mock_google_oauth, db_session, user):
    response = await client.post("/auth/google/callback", json={"code": "test_code"})
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_telegram_auth_url(client):
    response = await client.get("/auth/telegram")
    assert response.status_code == 200
    assert "session_id" in response.json()

@pytest.mark.asyncio
async def test_refresh_token_success(client, regular_user):
    client.cookies.set("refresh_token", regular_user["token"])
    response = await client.post("/auth/refresh")
    assert response.status_code == 200
    assert "access_token" in response.json()
