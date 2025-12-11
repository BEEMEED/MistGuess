from services.mathmaking_service import mathmaking_instance
from config import config
from fastapi import APIRouter, WebSocket, Depends, HTTPException, WebSocketDisconnect
from services.authorization import AuthService
from utils.bd_service import DataBase
import logging
from database.database import get_db
from repositories.user_repository import UserRepository
from repositories.lobby_repository import LobbyRepository
logger = logging.getLogger(__name__)
router = APIRouter()
auth = AuthService()



@router.websocket("/")
async def mathmaking_route(websocket: WebSocket):
    await websocket.accept()

    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="Missing token")
        return
    try:
        from database.database import asyncsession
        async with asyncsession() as db:
            token_data = await auth.verifyToken(db, token)
            user_id = token_data["user_id"]

            
            user = await UserRepository.get_by_id(db, user_id)
            if user is None:
                await websocket.close(code=1008, reason="User not found")
                return
            xp = user.xp  
    except HTTPException:
        await websocket.close(code=1008, reason="Invalid token")
        return
    logger.info(f"User {user_id} connected to mathmaking")
    try:
        await mathmaking_instance.join_queue(user_id, websocket, xp)
        while True:
            message = await websocket.receive_json()
            if message["type"] == "stop_mathmaking":
                await mathmaking_instance.leave_queue(user_id, websocket, xp)
                break
    except WebSocketDisconnect:
        logger.info(f"User {user_id} disconnected from mathmaking")
    except Exception as e:
        logger.error(f"Mathmaking error: {str(e)}")
    finally:

        try:
            await mathmaking_instance.leave_queue(user_id, websocket, xp)
            logger.info(f"User {user_id} removed from queue")
        except Exception as e:
            logger.debug(f"Failed to remove {user_id} from queue: {str(e)}")
