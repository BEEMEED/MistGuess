from fastapi import FastAPI, requests
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers.authorization_router import router as auth
from routers.lobby_router import router as lobby_router
from routers.websocket_router import router as websocket
from routers.profile_router import router as profile
from routers.admin_router import router as admin
from routers.telegram import router as telegram
from routers.matchmaking_router import router as matchmaking
import logging
from services.matchmaking_service import matchmaking_instance
from database.database import engine
from database.base import Base
import asyncio
from models.user import User
from models.locations import Locations
from models.lobby import Lobby

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s - %(funcName)s - %(message)s",
    handlers=[logging.FileHandler("app.log"), logging.StreamHandler()],
)

logger = logging.getLogger(__name__)


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://mistguess.netlify.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    logger.info("Matchmaking queue started")
    asyncio.create_task(matchmaking_instance.matchmaking_loop())
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/")
async def root():
    return {"status": "ok", "message": "GeoGuessr API is running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


app.mount("/static", StaticFiles(directory="static"), name="static")
app.include_router(telegram, prefix="/telegram", tags=["telegram"])
app.include_router(matchmaking, prefix="/matchmaking", tags=["matchmaking"])
app.include_router(admin, prefix="/admin", tags=["admin"])
app.include_router(auth, prefix="/auth", tags=["auth"])
app.include_router(lobby_router, prefix="/lobbies", tags=["lobbies"])
app.include_router(websocket, tags=["ws"])
app.include_router(profile, prefix="/profile", tags=["profile"])


if __name__ == "__main__":
    logger.info("FastAPI application starting")
