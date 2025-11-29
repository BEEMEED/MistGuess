from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers.authorization_router import router as auth
from routers.lobby_router import router as lobby
from routers.websocket_router import router as websocket
from routers.Profile_router import router as profile
from routers.admin_router import router as admin
from routers.telegram import router as telegram
from routers.mathmaking_router import router as mathmaking
import logging

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s - %(funcName)s - %(message)s",
    handlers=[logging.FileHandler("app.log"), logging.StreamHandler()],
)


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from services.mathmaking_service import mathmaking_instance
import asyncio


@app.on_event("startup")
async def startup_event():
    print("queue started")
    asyncio.create_task(mathmaking_instance.mathmaging_loop())


app.mount("/static", StaticFiles(directory="static"), name="static")
app.include_router(telegram, prefix="/telegram", tags=["telegram"])
app.include_router(mathmaking, prefix="/mathmaking", tags=["mathmaking"])
app.include_router(admin, prefix="/admin", tags=["admin"])
app.include_router(auth, prefix="/auth", tags=["auth"])
app.include_router(lobby, prefix="/lobbies", tags=["lobbies"])
app.include_router(websocket, tags=["ws"])
app.include_router(profile, prefix="/profile", tags=["profile"])


if __name__ == "__main__":
    print("start")
