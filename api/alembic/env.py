import asyncio
from logging.config import fileConfig
from config import Config
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from alembic import context

config = context.config

if not Config.DATABASE_URL:
    raise ValueError("DATABASE_URL is not set")

# Используем DATABASE_URL как есть (для Docker используется db, для локального - localhost)
db_url = Config.DATABASE_URL
config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from models.clans import ClanWars, Clans, ClanInvite
from models.lobby import Lobby
from models.locations import Locations
from models.user import User
from database.base import Base

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = create_async_engine(
        db_url,
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
