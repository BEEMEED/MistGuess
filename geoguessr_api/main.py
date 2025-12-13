from fastapi import FastAPI, requests, Request, Response
from slowapi.errors import RateLimitExceeded
from fastapi.middleware.cors import CORSMiddleware
from utils.rate_limiter import limiter
from fastapi.staticfiles import StaticFiles
from routers.authorization_router import router as auth
from routers.lobby_router import router as lobby
from routers.websocket_router import router as websocket
from routers.Profile_router import router as profile
from routers.admin_router import router as admin
from routers.telegram import router as telegram
from routers.mathmaking_router import router as mathmaking
from slowapi.middleware import SlowAPIMiddleware
import logging
from services.mathmaking_service import mathmaking_instance
from database.database import engine
from database.base import Base
import asyncio

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s - %(funcName)s - %(message)s",
    handlers=[logging.FileHandler("app.log"), logging.StreamHandler()],
)

logger = logging.getLogger(__name__)


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://mistguess.netlify.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def rate_lmit(request: Request, exc: RateLimitExceeded):
    return Response(status_code=429)


app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_lmit)  # type: ignore
app.add_middleware(SlowAPIMiddleware)


@app.on_event("startup")
async def startup_event():
    logger.info("Matchmaking queue started")
    asyncio.create_task(mathmaking_instance.mathmaging_loop())
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
app.include_router(mathmaking, prefix="/mathmaking", tags=["mathmaking"])
app.include_router(admin, prefix="/admin", tags=["admin"])
app.include_router(auth, prefix="/auth", tags=["auth"])
app.include_router(lobby, prefix="/lobbies", tags=["lobbies"])
app.include_router(websocket, tags=["ws"])
app.include_router(profile, prefix="/profile", tags=["profile"])


if __name__ == "__main__":
    logger.info("FastAPI application starting")
