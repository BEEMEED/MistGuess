from utils.bd_service import DataBase
from config import config
import secrets
from fastapi import HTTPException
class telegramAuth:
    def __init__(self) -> None:
        self.user_db = DataBase(config.DB_USERS)
        self.code = {}
    
    def generate_code(self, login: str):
        code =  secrets.token_urlsafe(6)
        self.code[code] = login
        return {"code":code,"login":login}
    
    def link_auth(self, code: str,telegramID: str):
        if code not in self.code:
            raise HTTPException(status_code=400, detail="Invalid code")
        login = self.code[code]

        data = self.user_db.read()
        if login not in data:
            raise HTTPException(status_code=404, detail="User not found")
        data[login]["telegram"] = telegramID
        self.user_db.write(data)
        del self.code[code]

        return {"success": True, "login": login}