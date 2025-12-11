from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from database.base import Base


class Locations(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True)
    lat: Mapped[float] = mapped_column(nullable=False)
    lon: Mapped[float] = mapped_column(nullable=False)
    region: Mapped[str] = mapped_column(nullable=False)
