from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from config import config

engine = create_async_engine(config.DATABASE_URL)
asyncsession = async_sessionmaker(engine,class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with asyncsession() as session:
        yield session
    