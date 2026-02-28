from pydantic import BaseModel, Field

class Report_request(BaseModel):
    suspect_id: int
    reporter_id: int
    reason: str = Field(min_length=10, max_length=255)