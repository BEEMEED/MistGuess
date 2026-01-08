from pydantic import BaseModel, Field

class EditName(BaseModel):
    new_name: str = Field(min_length=4, max_length=16)