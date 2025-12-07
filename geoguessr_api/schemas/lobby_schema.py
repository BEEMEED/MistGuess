from pydantic import BaseModel, Field
from fastapi import Depends
from utils.dependencies import Dependies
dep = Dependies()

class LobbyCreateRequest(BaseModel):
    max_players: int = Field(ge=2, le=10)
    rounds: int = Field(ge=1, le=10)
    timer: int = Field(ge=30, le=300)
    

    