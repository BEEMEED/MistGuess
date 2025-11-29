from services.mathmaking_service import mathmaking_instance
from config import config
from fastapi import APIRouter, WebSocket, Depends, HTTPException, WebSocketDisconnect
from services.authorization import AuthService
from utils.bd_service import DataBase
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
auth = AuthService()
db = DataBase(config.DB_USERS)


@router.websocket("/")
async def mathmaking_route(websocket: WebSocket):
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
    logger.info(f"User {login} connected to mathmaking")

    data = db.read()
    if login not in data:
        await websocket.close(code=1008, reason="User not found")
    xp = data[login].get("xp", 0)
    try:
        await mathmaking_instance.join_queue(login, websocket, xp)
        while True:
            message = await websocket.receive_json()
            if message["type"] == "stop_mathmaking":
                await mathmaking_instance.leave_queue(login, websocket, xp)
                break
    except WebSocketDisconnect:
        logger.info(f"User {login} disconnected from mathmaking")
    except Exception as e:
        logger.error(f"Mathmaking error: {str(e)}")
    finally:

        try:
            await mathmaking_instance.leave_queue(login, websocket, xp)
            logger.info(f"User {login} removed from queue")
        except Exception as e:
            logger.debug(f"Failed to remove {login} from queue: {str(e)}")
