import pytest


@pytest.mark.asyncio
async def test_register(client):

    response = await client.post('/auth/register', json={
        "login": "testuser",
        "password": "testpass123"
    })
    assert response.status_code == 200
    assert response.json()["login"] == "testuser"


@pytest.mark.asyncio
async def test_register_duplicate(client):

    await client.post('/auth/register', json={
        "login": "dupuser",
        "password": "pass123"
    })

    response = await client.post('/auth/register', json={
        "login": "dupuser",
        "password": "pass123"
    })
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login_success(client):

    await client.post('/auth/register', json={
        "login": "loginuser",
        "password": "pass123"
    })

 
    response = await client.post('/auth/login', json={
        "login": "loginuser",
        "password": "pass123"
    })
    assert response.status_code == 200
    assert "access_token" in response.cookies
    assert response.json()["login"] == "loginuser"


@pytest.mark.asyncio
async def test_login_wrong_password(client):

    await client.post('/auth/register', json={
        "login": "user1",
        "password": "correct"
    })

  
    response = await client.post('/auth/login', json={
        "login": "user1",
        "password": "wrong"
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
  
    response = await client.post('/auth/login', json={
        "login": "nouser",
        "password": "pass"
    })
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_register_empty_login(client):
  
    response = await client.post('/auth/register', json={
        "login": "",
        "password": "pass123"
    })
   
    assert response.status_code in [400, 422]


@pytest.mark.asyncio
async def test_register_empty_password(client):

    response = await client.post('/auth/register', json={
        "login": "testuser2",
        "password": ""
    })
    assert response.status_code in [400, 422]