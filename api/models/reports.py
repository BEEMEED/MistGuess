from sqlalchemy import String, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from database.base import Base


class Reports(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    suspect_id: Mapped[int] = mapped_column(nullable=False)
    reporter_id: Mapped[int] = mapped_column(nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    demo: Mapped[str] = mapped_column(JSONB, nullable=False)


