from services.websocket_service import ws_service
from fastapi import APIRouter, WebSocket, HTTPException, WebSocketDisconnect, Depends
from utils.token_manager import TokenManager
import asyncio
import time
import logging
from cache.redis import r
from utils.dependencies import Dependies
from services.authorization import AuthService
from database.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.lobby_repository import LobbyRepository
from database.database import asyncsession
from starlette.websockets import WebSocketState


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
        async with asyncsession() as db:
            lobby = await LobbyRepository.get_by_code(db, lobby_code)
            if not lobby:
                await websocket.close(code=1008, reason="Lobby not found")
                return

            token_data = await TokenManager.verifyToken(db, token)
            user_id = token_data["user_id"]

            await ws_service.player_joined(db, user_id, lobby_code, websocket)
            
            if websocket.client_state != WebSocketState.CONNECTED:
                return
    except HTTPException:
        await websocket.close(code=1008, reason="Invalid token")
        return
    handlers = {
        # game
        "game_start": lambda db, data: ws_service.GameStart(db,lobby_code),
        "game_end": lambda db, data: ws_service.GameEnded(db,lobby_code),
        "submit_guess": lambda db, data: ws_service.submitGuess(db,user_id,lobby_code,data["lat"],data["lon"]),
        # players
        "player_joined": lambda db, data: ws_service.player_joined(db,user_id,lobby_code,websocket),
        "player_left": lambda db, data: ws_service.player_left(db,user_id,lobby_code,websocket),
        "player_reconnect": lambda db,data: ws_service.reconect(db,user_id,lobby_code,websocket),
        "broadcast": lambda db, data:ws_service.broadcast(db,user_id,lobby_code, data["message"]),
        # rounds
        "round_start": lambda db, data: ws_service.RoundStarted(db,lobby_code),
        "round_end": lambda db, data: ws_service.RoundEnded(db,lobby_code),
        # spectator
        "spectate": lambda db, data: ws_service.camera_update(lobby_code, data, data["num_player"]),
        
        
    }
    try:
        while True:
            data = await websocket.receive_json()
            
            async with asyncsession() as db:
                message_type = data.get("type")
                handler = handlers.get(message_type)
                if handler:
                    await handler(db,data)
                else:
                    logger.warning(f"Unknown message type: {message_type}")
                

    except WebSocketDisconnect:
        if lobby_code not in ws_service.connections:
            return

        await r.setex(f"disconnect:{lobby_code}:{user_id}", 180, str(time.time()))

        if lobby_code in ws_service.connections:
            for player_id, ws in ws_service.connections[lobby_code]:
                if player_id != user_id:
                    try:
                        await ws.send_json({"type": "player_disconnected", "player": user_id})
                    except Exception as e:
                        logger.error(f"failed to send disconnect {user_id}: {e}")


        async def kick_task():
            async with asyncsession() as db:
                await ws_service.kick_timer(db, user_id, lobby_code, websocket)
        asyncio.create_task(kick_task())

    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        import traceback
        logger.exception(traceback.format_exc())

        async with asyncsession() as db:
            await ws_service.player_left(db, user_id, lobby_code, websocket)

@router.websocket("/ws/{lobby_code}/spectate")
async def spectate(websocket: WebSocket, lobby_code: str):
    await websocket.accept()

    token = websocket.query_params.get("token")

    if not token:
        await websocket.close(code=1008, reason="Missing token")
        return

    try:
        async with asyncsession() as db:

            lobby = await LobbyRepository.get_by_code(db, lobby_code)
            if not lobby:
                await websocket.close(code=1008, reason="Lobby not found")
                return

            await TokenManager.verifyToken(db, token)
          
            if websocket.client_state != WebSocketState.CONNECTED:
                return
    except HTTPException:
        await websocket.close(code=1008, reason="Invalid token")
        return
    
    if lobby_code not in ws_service.spectators:
        ws_service.spectators[lobby_code] = []
    ws_service.spectators[lobby_code].append(websocket)


    try:
        game = await ws_service._get_game(lobby_code)
        if game:
            current_index = game["current_location_index"]
            current_location = game["locations"][current_index]
            await websocket.send_json({
                "type": "round_started",
                "lat": current_location["lat"],
                "lon": current_location["lon"],
                "hp": game.get("hp", {}),
            })
        async with asyncsession() as db:
            lobby_obj = await LobbyRepository.get_by_code(db, lobby_code)
            if lobby_obj:
                players_info = [await ws_service.user_GetInfo(db, uid) for uid in lobby_obj.users]
                await websocket.send_json({"type": "player_joined", "players": players_info})
    except Exception as e:
        logger.error(f"Failed to send initial spectator state: {e}")

    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        if lobby_code in ws_service.spectators and websocket in ws_service.spectators[lobby_code]:
            ws_service.spectators[lobby_code].remove(websocket)
    except Exception as e:
        logger.error(f"Spectator WS error: {e}")
        if lobby_code in ws_service.spectators and websocket in ws_service.spectators[lobby_code]:
            ws_service.spectators[lobby_code].remove(websocket)
    


