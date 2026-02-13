import pytest
import asyncio
import sys
from httpx import AsyncClient, ASGITransport

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from database.base import Base
from models.locations import Locations
from main import app
from models.lobby import Lobby
from models.user import User
from models.clans import Clans, ClanInvite
from datetime import datetime, timedelta
from providers.google import GoogleOAuthProvider
from utils.token_manager import TokenManager
from providers.telegram import TelegramOAuthProvider
import pytest_asyncio
from utils.dependencies import Dependies
from database.database import get_db
from models.clans import Clans
from config import config

if not config.DATABASE_URL:
    raise ValueError("DATABASE_URL is not set")
TEST_DATABASE_URL = config.DATABASE_URL.replace("@db:", "@localhost:").replace(":5432/", ":5433/")
engine = create_async_engine(TEST_DATABASE_URL, echo=False, connect_args={"ssl": False}, poolclass=NullPool)
TestSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop_policy():
    return asyncio.get_event_loop_policy()


@pytest_asyncio.fixture(scope="function")
async def db_session():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestSessionLocal() as session:
        yield session
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture()
async def client(db_session):
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()

@pytest_asyncio.fixture()
async def user(db_session):
    user = User(
        username="test",
        google_id="mock_google_id_321",
        name="sypho",
    )
    db_session.add(user)
    await db_session.commit()
    
    yield user

    await db_session.delete(user)
    await db_session.commit()

@pytest_asyncio.fixture()
async def user_admin(db_session):
    user = User(
        username="test",
        google_id="12333",
        name="sypho",
        role="admin",
    )
    db_session.add(user)
    await db_session.commit()    
    yield user

    await db_session.delete(user)
    await db_session.commit()

@pytest_asyncio.fixture()
async def mock_current_user(user):
    def mock_get_user():
        return user
    
    app.dependency_overrides[Dependies.get_current_user] = mock_get_user
    yield

    app.dependency_overrides.clear()

@pytest_asyncio.fixture()
async def mock_current_admin(user_admin):
    def mock_get_user():
        return user_admin
    
    app.dependency_overrides[Dependies.get_current_user] = mock_get_user
    yield

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
def mock_google_oauth(monkeypatch):
    async def mock_exchange_code(self,code:str):
        if code == "test_code":
            return "mock_access_token"
        raise Exception("Invalid code")
    
    async def mock_get_user_data(self,access_token: str):
        return {
            "google_id": "mock_google_id_321",
            "email": "mock_email",
            "name": "mock_name",
        }
    monkeypatch.setattr(GoogleOAuthProvider, "exchange_code", mock_exchange_code)
    monkeypatch.setattr(GoogleOAuthProvider, "get_user_data", mock_get_user_data)
    yield

@pytest_asyncio.fixture
async def mock_telegram_oauth(monkeypatch):
    async def mock_success_login(self,code: str,user_id: int):
        return {
            "status": "success",
            "user_id": user_id,
            "access_token": "mock_access_token"
        }
    monkeypatch.setattr(TelegramOAuthProvider, "exchange_code", mock_success_login)
    yield

@pytest_asyncio.fixture
async def redis_client(monkeypatch):
    from fakeredis import FakeAsyncRedis
    fake = FakeAsyncRedis(decode_responses=True)
    monkeypatch.setattr("routers.profile_router.r", fake)
    monkeypatch.setattr("utils.rate_limiter.r", fake)
    monkeypatch.setattr("services.websocket_service.r", fake)
    monkeypatch.setattr("routers.websocket_router.r", fake)
    yield fake

@pytest_asyncio.fixture
async def regular_user(db_session):
    user = User(
        username="test",
        google_id="12333",
        name="sypho",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = TokenManager.create_access_token({"id":user.id})

    user.refresh_token = token
    await db_session.commit()

    yield {"user": user, "token": token}

    await db_session.delete(user)
    await db_session.commit()

@pytest_asyncio.fixture
async def regular_user_admin(db_session):
    user = User(
        username="admin",
        google_id="123123",
        name="admin",
        role="admin",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = TokenManager.create_access_token({"id":user.id})

    user.refresh_token = token
    await db_session.commit()

    yield {"user": user, "token": token}

    await db_session.delete(user)
    await db_session.commit()

@pytest_asyncio.fixture
async def lobby(db_session, regular_user):
    lobby = Lobby(
        invite_code="mock_invite_code",
        host_id=regular_user["user"].id,
        users=[regular_user["user"].id],
        locations=["location1","location2"],
    )
    db_session.add(lobby)
    await db_session.commit()

    yield lobby

    await db_session.delete(lobby)
    await db_session.commit()

@pytest_asyncio.fixture
async def Location(db_session):
    location = Locations(lat=1, lon=3, region="europe", country="Russia")
    db_session.add(location)
    await db_session.commit()

    yield location

    await db_session.delete(location)
    await db_session.commit()

@pytest_asyncio.fixture
async def high_xp_user(db_session):
    user = User(username="highxp", google_id="highxp_gid", name="HighXP", xp=500)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    token = TokenManager.create_access_token({"id": user.id})
    yield {"user": user, "token": token}
    await db_session.delete(user)
    await db_session.commit()


@pytest_asyncio.fixture
async def clan(db_session, regular_user):
    c = Clans(
        name="TestClan",
        tag="TST",
        owner_id=regular_user["user"].id,
        members=[regular_user["user"].id],
        member_count=1,
        rank="Bronze",
    )
    db_session.add(c)
    await db_session.commit()
    await db_session.refresh(c)
    regular_user["user"].clan_id = c.id
    regular_user["user"].clan_role = "owner"
    await db_session.commit()
    yield c


@pytest_asyncio.fixture
async def clan_invite(db_session, clan, regular_user):
    invite = ClanInvite(
        clan_id=clan.id,
        inviter_id=regular_user["user"].id,
        invitee_id=0,
        code="testinvite00",
        status="pending",
        expires_at=datetime.now() + timedelta(hours=1),
    )
    db_session.add(invite)
    await db_session.commit()
    yield invite