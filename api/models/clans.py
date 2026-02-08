from sqlalchemy import String, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from database.base import Base
from datetime import datetime
from typing import Any


class Clans(Base):
    __tablename__ = "clans"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(15), unique=True, nullable=False)
    tag: Mapped[str] = mapped_column(String(5), unique=True, nullable=False)
    owner_id: Mapped[int] = mapped_column(nullable=False)
    members: Mapped[Any] = mapped_column(JSON, nullable=False)
    member_count: Mapped[int] = mapped_column(default=0)
    rank: Mapped[str] = mapped_column(default="Bronze")
    xp: Mapped[int] = mapped_column(default=0)
    reputation: Mapped[int] = mapped_column(default=100)
    description: Mapped[str] = mapped_column(String(150), default="No description")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now())
    wars_won: Mapped[int] = mapped_column(default=0)
    wars_lost: Mapped[int] = mapped_column(default=0)
    wars_total: Mapped[int] = mapped_column(default=0)


class ClanWars(Base):
    __tablename__ = "clan_wars"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    clan_1_id: Mapped[int] = mapped_column(nullable=False)
    clan_2_id: Mapped[int] = mapped_column(nullable=False)
    rounds: Mapped[int] = mapped_column(default=5, nullable=False)
    status: Mapped[str] = mapped_column(
        default="pending", nullable=False
    )  # pending/ongoing/completed/cancelled
    clan_1_score: Mapped[int] = mapped_column(default=0, nullable=False)
    clan_2_score: Mapped[int] = mapped_column(default=0, nullable=False)
    winner_clan_id: Mapped[int] = mapped_column(default=0, nullable=False)
    participants: Mapped[Any] = mapped_column(JSON)
    round_results: Mapped[Any] = mapped_column(JSON)
    xp_awarded_clan_1: Mapped[int] = mapped_column(default=0, nullable=False)
    xp_awarded_clan_2: Mapped[int] = mapped_column(default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now())
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_by_user_id: Mapped[int] = mapped_column(nullable=False)


class ClanInvite(Base):
    __tablename__ = "clan_invites"

    id: Mapped[int] = mapped_column(primary_key=True)
    clan_id: Mapped[int] = mapped_column(nullable=False)
    inviter_id: Mapped[int] = mapped_column(nullable=False)
    invitee_id: Mapped[int] = mapped_column(nullable=False)
    code: Mapped[str] = mapped_column(String(15), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
