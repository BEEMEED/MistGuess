from sqlalchemy import String, DateTime, JSON, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.base import Base
from datetime import datetime


class Ban(Base):
    __tablename__ = "ban"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    baned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    banned_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    google_id: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(20), default="Player")
    avatar: Mapped[str] = mapped_column(default="")
    xp: Mapped[int] = mapped_column(default=0)
    rank: Mapped[str] = mapped_column(default="Ashborn")
    role: Mapped[str] = mapped_column(default="user")
    telegram: Mapped[str] = mapped_column(default="null")
    games_played: Mapped[int] = mapped_column(default=0)
    games_won: Mapped[int] = mapped_column(default=0)
    games_lost: Mapped[int] = mapped_column(default=0)
    refresh_token: Mapped[str] = mapped_column(String(255), nullable=True)

    clan_id: Mapped[int] = mapped_column(default=0)
    clan_role: Mapped[str] = mapped_column(default="none")
    clan_join_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    country_stats: Mapped[dict] = mapped_column(JSON, default={})
    ban: Mapped[Ban | None] = relationship("Ban", foreign_keys="Ban.user_id", uselist=False)

