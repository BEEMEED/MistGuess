from pydantic import BaseModel, Field


class EditName(BaseModel):
    new_name: str = Field(min_length=4, max_length=16)


class Leaderboard(BaseModel):
    name: str
    xp: int
    rank: str
    avatar: str

    class Config:
        from_attributes = True
