import pytest


@pytest.mark.asyncio
async def test_get_profile(client):
    await client.post('/auth/register', json={
        "login": "profileuser",
        "password": "pass123"
    })

    login_response = await client.post('/auth/login', json={
        "login": "profileuser",
        "password": "pass123"
    })

    response = await client.get('/profile/me')
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "profileuser"
    assert data["xp"] == 0
    assert data["rank"] == "Ashborn"


@pytest.mark.asyncio
async def test_update_name(client):
    await client.post('/auth/register', json={
        "login": "nameuser",
        "password": "pass123"
    })

    await client.post('/auth/login', json={
        "login": "nameuser",
        "password": "pass123"
    })

    response = await client.post('/profile/name', params={"new_name": "NewName"})
    assert response.status_code == 200

    profile = await client.get('/profile/me')
    assert profile.json()["name"] == "NewName"


@pytest.mark.asyncio
async def test_update_name_too_short(client):
    await client.post('/auth/register', json={
        "login": "user2",
        "password": "pass123"
    })

    await client.post('/auth/login', json={
        "login": "user2",
        "password": "pass123"
    })

    response = await client.post('/profile/name', params={"new_name": "abc"})
    assert response.status_code in [400, 422]


@pytest.mark.asyncio
async def test_update_name_too_long(client):
    await client.post('/auth/register', json={
        "login": "user3",
        "password": "pass123"
    })

    await client.post('/auth/login', json={
        "login": "user3",
        "password": "pass123"
    })

    response = await client.post('/profile/name', params={"new_name": "a" * 20})
    assert response.status_code in [400, 422]


@pytest.mark.asyncio
async def test_profile_unauthorized(client):
    response = await client.get('/profile/me')
    assert response.status_code == 401
