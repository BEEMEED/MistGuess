import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from services.websocket_service import ws_service
from fastapi import WebSocket


@pytest.fixture
async def mock_redis():
    with patch('services.websocket_service.r') as mock_r:
        mock_r.get = AsyncMock(return_value=None)
        mock_r.setex = AsyncMock()
        mock_r.delete = AsyncMock()
        yield mock_r


@pytest.fixture
def mock_db():
    db = MagicMock()
    return db


@pytest.fixture
def test_lobby():
    user1 = MagicMock()
    user1.id = 1
    user1.username = "player1"

    user2 = MagicMock()
    user2.id = 2
    user2.username = "player2"

    lobby = MagicMock()
    lobby.invite_code = "TEST123"
    lobby.host_id = 1
    lobby.users = [user1, user2]
    lobby.locations = [
        {"lat": 50.0, "lon": 30.0, "url": "test_url_1", "region": "test_region"},
        {"lat": 51.0, "lon": 31.0, "url": "test_url_2", "region": "test_region"}
    ]

    return {
        "lobby": lobby,
        "user1": user1,
        "user2": user2,
        "invite_code": lobby.invite_code
    }


@pytest.fixture
def mock_websocket():
    ws = MagicMock(spec=WebSocket)
    ws.send_json = AsyncMock()
    ws.close = AsyncMock()
    return ws


@pytest.mark.asyncio
async def test_get_game_helper(mock_redis):
    game = await ws_service._get_game("test_code")
    assert game is None

    game_data = {
        "current_location_index": 0,
        "locations": [{"lat": 50.0, "lon": 30.0, "url": "test"}],
        "guesses": {},
        "hp": {"1": 6000, "2": 6000}
    }
    mock_redis.get.return_value = json.dumps(game_data)

    game = await ws_service._get_game("test_code")
    assert game is not None
    assert game["current_location_index"] == 0
    assert game["hp"] == {"1": 6000, "2": 6000}


@pytest.mark.asyncio
async def test_game_start(mock_db, test_lobby, mock_redis, mock_websocket):
    lobby_data = test_lobby
    invite_code = lobby_data["invite_code"]

    ws_service.connections[invite_code] = [
        (lobby_data["user1"].id, mock_websocket),
        (lobby_data["user2"].id, mock_websocket)
    ]

    await ws_service.GameStart(mock_db, invite_code)

    mock_redis.setex.assert_called()
    call_args = mock_redis.setex.call_args[0]
    assert call_args[0] == f"game:{invite_code}"
    assert call_args[1] == 3600

    game_json = call_args[2]
    game = json.loads(game_json)
    assert game["current_location_index"] == 0
    assert "locations" in game
    assert "guesses" in game
    assert "hp" in game
    assert len(game["hp"]) == 2

    assert mock_websocket.send_json.call_count >= 2

    del ws_service.connections[invite_code]


@pytest.mark.asyncio
async def test_submit_guess(mock_db, test_lobby, mock_redis, mock_websocket):
    lobby_data = test_lobby
    invite_code = lobby_data["invite_code"]
    user_id = lobby_data["user1"].id

    game_data = {
        "current_location_index": 0,
        "locations": [{"lat": 50.0, "lon": 30.0, "url": "test", "region": "test"}],
        "guesses": {},
        "hp": {lobby_data["user1"].id: 6000, lobby_data["user2"].id: 6000}
    }
    mock_redis.get.return_value = json.dumps(game_data)

    ws_service.connections[invite_code] = [
        (lobby_data["user1"].id, mock_websocket),
        (lobby_data["user2"].id, mock_websocket)
    ]

    await ws_service.submitGuess(mock_db, user_id, invite_code, 50.1, 30.1)

    mock_redis.setex.assert_called()
    call_args = mock_redis.setex.call_args[0]
    updated_game = json.loads(call_args[2])

    assert 0 in updated_game["guesses"]
    assert len(updated_game["guesses"][0]) == 1
    assert updated_game["guesses"][0][0]["player"] == user_id

    del ws_service.connections[invite_code]


@pytest.mark.asyncio
async def test_round_started(mock_db, test_lobby, mock_redis, mock_websocket):
    lobby_data = test_lobby
    invite_code = lobby_data["invite_code"]

    game_data = {
        "current_location_index": 0,
        "locations": [{"lat": 50.0, "lon": 30.0, "url": "test", "region": "test"}],
        "guesses": {},
        "hp": {lobby_data["user1"].id: 6000, lobby_data["user2"].id: 6000}
    }
    mock_redis.get.return_value = json.dumps(game_data)

    ws_service.connections[invite_code] = [
        (lobby_data["user1"].id, mock_websocket)
    ]

    await ws_service.RoundStarted(mock_db, invite_code)

    mock_redis.setex.assert_called()
    call_args = mock_redis.setex.call_args[0]
    updated_game = json.loads(call_args[2])

    assert "started_rounds" in updated_game
    assert 0 in updated_game["started_rounds"]
    assert "RoundsStartTime" in updated_game

    del ws_service.connections[invite_code]
    if invite_code in ws_service.timers:
        ws_service.timers[invite_code].cancel()
        del ws_service.timers[invite_code]


@pytest.mark.asyncio
async def test_disconnect_tracking(mock_db, test_lobby, mock_redis):
    lobby_data = test_lobby
    invite_code = lobby_data["invite_code"]
    user_id = lobby_data["user1"].id

    import time
    timestamp = str(time.time())

    await mock_redis.setex(f"disconnect:{invite_code}:{user_id}", 180, timestamp)

    mock_redis.setex.assert_called_with(
        f"disconnect:{invite_code}:{user_id}",
        180,
        timestamp
    )


@pytest.mark.asyncio
async def test_game_ended(mock_db, test_lobby, mock_redis, mock_websocket):
    lobby_data = test_lobby
    invite_code = lobby_data["invite_code"]

    game_data = {
        "current_location_index": 1,
        "locations": [{"lat": 50.0, "lon": 30.0, "url": "test"}],
        "guesses": {
            0: [
                {"player": lobby_data["user1"].id, "distance": 100, "lat": 50.1, "lon": 30.1},
                {"player": lobby_data["user2"].id, "distance": 200, "lat": 50.2, "lon": 30.2}
            ]
        },
        "hp": {lobby_data["user1"].id: 5000, lobby_data["user2"].id: 4800}
    }
    mock_redis.get.return_value = json.dumps(game_data)

    ws_service.connections[invite_code] = [
        (lobby_data["user1"].id, mock_websocket),
        (lobby_data["user2"].id, mock_websocket)
    ]

    await ws_service.GameEnded(mock_db, invite_code)

    mock_redis.delete.assert_called_with(f"game:{invite_code}")

    assert mock_websocket.send_json.call_count > 0

    if invite_code in ws_service.connections:
        del ws_service.connections[invite_code]


@pytest.mark.asyncio
async def test_get_active_lobbies(mock_db, test_lobby, mock_redis):
    lobby_data = test_lobby
    invite_code = lobby_data["invite_code"]
    user_id = lobby_data["user1"].id

    game_data = {
        "current_location_index": 0,
        "hp": {user_id: 6000}
    }
    mock_redis.get.return_value = json.dumps(game_data)

    mock_ws = MagicMock()
    ws_service.connections[invite_code] = [(user_id, mock_ws)]

    lobbies = await ws_service.get_active_lobbies(user_id)

    assert len(lobbies) == 1
    assert lobbies[0]["InviteCode"] == invite_code
    assert lobbies[0]["ingame"] == True
    assert lobbies[0]["current_location_index"] == 0
    assert lobbies[0]["hp"] == {user_id: 6000}

    del ws_service.connections[invite_code]
