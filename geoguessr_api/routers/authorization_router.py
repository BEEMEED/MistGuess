from fastapi import APIRouter, Body, Response, Request
from services.authorization import AuthService
from utils.rate_limiter import limiter
Auth = AuthService()
router = APIRouter()




@router.post("/google")
@limiter.limit("3/minute")
async def loginGoogle(request: Request):
    return Auth.GoogleAuth()


@router.post("/google/callback")
async def loginGoogleCallback(response: Response, code: str = Body(..., embed=True)):
    result = Auth.LoginGoogle_service(code)
    response.set_cookie(
        key="access_token",
        value=result["token"],
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=604800,
    )
    return {"login": result["login"], "token": result["token"]}

# --- for testing ---
@router.post("/register")
async def register(login: str = Body(...), password: str = Body(...)):

    return Auth.register(login, password)


@router.post("/login")
async def login(response: Response, login: str = Body(...), password: str = Body(...)):
    
    result = Auth.login(login, password)
    response.set_cookie(
        key="access_token",
        value=result["token"],
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=604800,
    )
    return {"login": result["login"], "token": result["token"]}
