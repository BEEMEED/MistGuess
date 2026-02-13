import pytest
from unittest.mock import AsyncMock
from models.user import User
from repositories.lobby_repository import LobbyRepository


@pytest.mark.asyncio
async def test_join_matchmaking_queue(regular_user):
    from services.matchmaking_service import MatchmakingService
    service = MatchmakingService()
    ws = AsyncMock()
    user = regular_user["user"]
    await service.join_queue(user.id, ws, user.xp)
    ws.send_json.assert_called_once()
    call_args = ws.send_json.call_args[0][0]
    assert call_args["type"] == "queue_joined"
    assert len(service.queue) == 1


@pytest.mark.asyncio
async def test_matchmaking_creates_match(regular_user, db_session):
    from services.matchmaking_service import MatchmakingService
    service = MatchmakingService()

    user2 = User(username="player2", google_id="google2", name="player2")
    db_session.add(user2)
    await db_session.commit()
    await db_session.refresh(user2)

    ws1, ws2 = AsyncMock(), AsyncMock()
    lobby = await LobbyRepository.create(db=db_session, host_id=regular_user["user"].id)

    service.queue = [
        (regular_user["user"].id, ws1, regular_user["user"].xp),
        (user2.id, ws2, user2.xp),
    ]

    await service.match_found(ws1, ws2, regular_user["user"], user2, lobby.invite_code)

    calls1 = [c.args[0] for c in ws1.send_json.call_args_list]
    assert any(c["type"] == "match_found" for c in calls1)
    assert any(c["type"] == "redirect" for c in calls1)
    assert calls1[0]["LobbyCode"] == lobby.invite_code
