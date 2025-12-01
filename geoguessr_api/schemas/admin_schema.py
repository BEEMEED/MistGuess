from pydantic import BaseModel, Field

class AdminRequestMain(BaseModel):
    limit: int = Field(ge=10, )
    page: int = Field(ge=1)

class AddLocationAdmin(BaseModel):
    lat: float = Field(ge=-90.0, le=90.0)
    lon: float = Field(ge=-180.0, le=180.0)
    region: str = Field(max_length=18)

class ChangeLocationAdmin(BaseModel):
    lat_new: float = Field(ge=-90.0, le=90.0)
    lon_new: float = Field(ge=-180.0, le=180.0)
    region_new: str = Field(max_length=18)
    id: int = Field(ge=1)

class DeleteLocationAdmin(BaseModel):
    id: int = Field(ge=1)

class BanUserAdmin(BaseModel):
    login: str = Field(min_length=4, max_length=20)
    reason: str = Field(min_length=3, max_length=50)

class AddAdmin(BaseModel):
    login: str = Field(min_length=4, max_length=20)

class SendTelegramMessage(BaseModel):
    login: str = Field(min_length=4, max_length=20)
    message: str = Field(min_length=4, max_length=50)
