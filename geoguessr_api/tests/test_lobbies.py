import pytest


@pytest.mark.asyncio
async def test_create_lobby(client):
    await client.post('/auth/register', json={
        "login": "lobbyuser",
        "password": "pass123"
    })

    await client.post('/auth/login', json={
        "login": "lobbyuser",
        "password": "pass123"
    })

    response = await client.post('/lobbies/create', json={
        "max_players": 4,
        "rounds": 3
    })
    assert response.status_code == 200
    assert "InviteCode" in response.json()


@pytest.mark.asyncio
async def test_create_lobby_unauthorized(client):
    response = await client.post('/lobbies/create', json={
        "max_players": 4,
        "rounds": 3
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_lobby_invalid_players(client):
    await client.post('/auth/register', json={
        "login": "user4",
        "password": "pass123"
    })

    await client.post('/auth/login', json={
        "login": "user4",
        "password": "pass123"
    })

    response = await client.post('/lobbies/create', json={
        "max_players": 1,
        "rounds": 3
    })
    assert response.status_code in [400, 422]


@pytest.mark.asyncio
async def test_create_lobby_invalid_rounds(client):
    await client.post('/auth/register', json={
        "login": "user5",
        "password": "pass123"
    })

    await client.post('/auth/login', json={
        "login": "user5",
        "password": "pass123"
    })

    response = await client.post('/lobbies/create', json={
        "max_players": 4,
        "rounds": 0
    })
    assert response.status_code in [400, 422]


@pytest.mark.asyncio
async def test_join_lobby(client):
    await client.post('/auth/register', json={
        "login": "host",
        "password": "pass123"
    })

    await client.post('/auth/login', json={
        "login": "host",
        "password": "pass123"
    })

    create_response = await client.post('/lobbies/create', json={
        "max_players": 4,
        "rounds": 3
    })
    invite_code = create_response.json()["InviteCode"]

    await client.post('/auth/register', json={
        "login": "guest",
        "password": "pass123"
    })

    await client.post('/auth/login', json={
        "login": "guest",
        "password": "pass123"
    })

    response = await client.post('/lobbies/join', json={
        "InviteCode": invite_code
    })
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_join_nonexistent_lobby(client):
    await client.post('/auth/register', json={
        "login": "user6",
        "password": "pass123"
    })

    await client.post('/auth/login', json={
        "login": "user6",
        "password": "pass123"
    })

    response = await client.post('/lobbies/join', json={
        "InviteCode": "INVALID"
    })
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_leave_lobby(client):
    await client.post('/auth/register', json={
        "login": "leaveuser",
        "password": "pass123"
    })

    await client.post('/auth/login', json={
        "login": "leaveuser",
        "password": "pass123"
    })

    create_response = await client.post('/lobbies/create', json={
        "max_players": 4,
        "rounds": 3
    })
    invite_code = create_response.json()["InviteCode"]

    response = await client.post('/lobbies/leave', json={
        "InviteCode": invite_code
    })
    assert response.status_code == 200
