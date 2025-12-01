from utils.bd_service import DataBase
from config import config
from fastapi import HTTPException, UploadFile, File, Body
async def get_invite_code(InviteCode: str = Body(... , embed=True)):
    data = DataBase(config.DB_LOBBY).read()
    if InviteCode not in data:
        raise HTTPException(status_code=404, detail="Lobby not found")
    return InviteCode

async def validate_avatar(file: UploadFile = File(...)) -> UploadFile:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    content = await file.read()

    max_size = 5 * 1024 * 1024 
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {max_size // (1024 * 1024)}MB")
    
    await file.seek(0)
    
    return file