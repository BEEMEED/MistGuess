from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column
from database.base import Base

class Lobby(Base):
    __tablename__ = "lobby"

    id: Mapped[int] = mapped_column(primary_key=True)
    invite_code: Mapped[str] = mapped_column(unique=True, nullable=False)
    host_id: Mapped[int] = mapped_column( nullable=False)
    timer: Mapped[int] = mapped_column(nullable=False,default=240)
    users: Mapped[list] = mapped_column(JSON, default=[])
    locations: Mapped[list] = mapped_column(JSON, nullable=False)

    mode: Mapped[str] = mapped_column(default=None)
    war_id: Mapped[int] = mapped_column(default=None)

