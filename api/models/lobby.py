from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship, Mapped,mapped_column
from database.base import Base
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

class Lobby(Base):
    __tablename__ = "lobby"

    id: Mapped[int] = mapped_column(primary_key=True)
    invite_code: Mapped[str] = mapped_column(unique=True, nullable=False)
    host_id: Mapped[int] = mapped_column( nullable=False)
    timer: Mapped[int] = mapped_column(nullable=False,default=240)
    users: Mapped[list] = mapped_column(ARRAY(Integer), default=[])
    locations: Mapped[list] = mapped_column(JSONB, nullable=False)

