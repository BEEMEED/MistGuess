from services.WebSocket_service import ws_service
from fastapi import APIRouter, WebSocket, HTTPException, WebSocketDisconnect, Depends
from services.authorization import AuthService
import asyncio
import time
from utils.dependencies import get_invite_code

auth = AuthService()
router = APIRouter()



@router.websocket("/ws/{lobby_code}")
async def GameStart(websocket: WebSocket,lobby_code: str = Depends(get_invite_code)):
    await websocket.accept()

    token = websocket.query_params.get("token")

    if not token:
        await websocket.close(code=1008, reason="Missing token")
        return

    try:
        token_data = await auth.verifyToken(token)
        login = token_data["login"]
    except HTTPException:
        await websocket.close(code=1008, reason="Invalid token")
        return

    await ws_service.player_joined(token_data["login"], lobby_code, websocket)
    try:
        while True:
            data = await websocket.receive_json()

            if data["type"] == "game_start":
                await ws_service.GameStart(lobby_code)

            elif data["type"] == "submit_guess":
                await ws_service.submitGuess(
                    token_data["login"], lobby_code, data["lat"], data["lon"]
                )

            elif data["type"] == "player_joined":
                await ws_service.player_joined(
                    login=token_data["login"],
                    InviteCode=lobby_code,
                    websocket=websocket,
                )

            elif data["type"] == "player_left":
                await ws_service.player_left(token_data["login"], lobby_code, websocket)

            elif data["type"] == "round_start":
                await ws_service.RoundStarted(lobby_code)

            elif data["type"] == "round_end":
                await ws_service.RoundEnded(lobby_code)

            elif data["type"] == "game_end":
                await ws_service.GameEnded(lobby_code)

            elif data["type"] == "broadcast":
                await ws_service.broadcast(
                    token_data["login"], lobby_code, data["message"]
                )
            elif data["type"] == "player_reconnect":
                await ws_service.reconect(login, lobby_code, websocket)

    except WebSocketDisconnect:
        if lobby_code not in ws_service.disconnects:
            ws_service.disconnects[lobby_code] = {}

        ws_service.disconnects[lobby_code][login] = time.time()

        for player_login, ws in ws_service.connections[lobby_code]:
            if player_login != login:
                try:
                    await ws.send_json({"type": "player_disconnected", "player": login})
                except Exception as e:
                    print(f"failed to send disconnect {login}: {e}")

        asyncio.create_task(ws_service.kick_timer(login, lobby_code, websocket))

    except Exception as e:
        print(f"websocket error: {e}")
        import traceback

        traceback.print_exc()
        await ws_service.player_left(token_data["login"], lobby_code, websocket)
