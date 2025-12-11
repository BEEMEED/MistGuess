from services.WebSocket_service import ws_service
from fastapi import APIRouter, WebSocket, HTTPException, WebSocketDisconnect, Depends
from services.authorization import AuthService
import asyncio
import time
import logging
from utils.dependencies import Dependies
from services.authorization import AuthService
from database.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

auth = AuthService()
dependies = Dependies()
logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/{lobby_code}")
async def GameStart(
    websocket: WebSocket, lobby_code: str
):
    await websocket.accept()

    token = websocket.query_params.get("token")

    if not token:
        await websocket.close(code=1008, reason="Missing token")
        return

    try:
        from database.database import asyncsession
        async with asyncsession() as db:
            from repositories.lobby_repository import LobbyRepository
            lobby = await LobbyRepository.get_by_code(db, lobby_code)
            if not lobby:
                await websocket.close(code=1008, reason="Lobby not found")
                return

            token_data = await auth.verifyToken(db, token)
            user_id = token_data["user_id"]

            await ws_service.player_joined(db, user_id, lobby_code, websocket)
    except HTTPException:
        await websocket.close(code=1008, reason="Invalid token")
        return
    from database.database import asyncsession
    try:
        while True:
            data = await websocket.receive_json()

            async with asyncsession() as db:
                if data["type"] == "game_start":
                    await ws_service.GameStart(db, lobby_code)

                elif data["type"] == "submit_guess":
                    await ws_service.submitGuess(
                        db, user_id, lobby_code, data["lat"], data["lon"]
                    )

                elif data["type"] == "player_joined":
                    await ws_service.player_joined(
                        db=db,
                        user_id=user_id,
                        InviteCode=lobby_code,
                        websocket=websocket,
                    )

                elif data["type"] == "player_left":
                    await ws_service.player_left(db, user_id, lobby_code, websocket)

                elif data["type"] == "round_start":
                    await ws_service.RoundStarted(db, lobby_code)

                elif data["type"] == "round_end":
                    await ws_service.RoundEnded(lobby_code)

                elif data["type"] == "game_end":
                    await ws_service.GameEnded(db, lobby_code)

                elif data["type"] == "broadcast":
                    await ws_service.broadcast(db, user_id, lobby_code, data["message"])

                elif data["type"] == "player_reconnect":
                    await ws_service.reconect(db, user_id, lobby_code, websocket)

    except WebSocketDisconnect:
        if lobby_code not in ws_service.connections:
            return

        if lobby_code not in ws_service.disconnects:
            ws_service.disconnects[lobby_code] = {}

        ws_service.disconnects[lobby_code][user_id] = time.time()

        if lobby_code in ws_service.connections:
            for player_id, ws in ws_service.connections[lobby_code]:
                if player_id != user_id:
                    try:
                        await ws.send_json({"type": "player_disconnected", "player": user_id})
                    except Exception as e:
                        logger.error(f"failed to send disconnect {user_id}: {e}")

        from database.database import asyncsession
        async def kick_task():
            async with asyncsession() as db:
                await ws_service.kick_timer(db, user_id, lobby_code, websocket)
        asyncio.create_task(kick_task())

    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        import traceback
        logger.exception(traceback.format_exc())

        from database.database import asyncsession
        async with asyncsession() as db:
            await ws_service.player_left(db, user_id, lobby_code, websocket)
