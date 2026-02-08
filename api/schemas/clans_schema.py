from pydantic import BaseModel

class ClanRequest(BaseModel):
    name: str
    tag: str
    description: str | None = None
