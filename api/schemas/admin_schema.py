from pydantic import BaseModel, Field

class AddLocationAdmin(BaseModel):
    lat: float = Field(ge=-90.0, le=90.0)
    lon: float = Field(ge=-180.0, le=180.0)
    region: str = Field(max_length=18)
    country: str = Field(max_length=50)


class ChangeLocationAdmin(BaseModel):
    lat: float | None = Field(default=None,ge=-90.0, le=90.0)
    lon: float | None = Field(default=None,ge=-180.0, le=180.0)
    country: str | None = Field(default=None,max_length=30)
    region: str | None = Field(default=None,max_length=18)
    





class BanUserAdmin(BaseModel):
    reason: str = Field(min_length=3, max_length=50)




class SendTelegramMessage(BaseModel):
    message: str = Field(min_length=4, max_length=50)
