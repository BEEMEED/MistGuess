from providers.base import IOAuthProvider
from config import config
from fastapi import HTTPException
import httpx
import logging
import urllib.parse
logger = logging.getLogger(__name__)

class GoogleOAuthProvider(IOAuthProvider):
    async def exchange_code(self, code: str) -> str:
        data = {
            "code": code,
            "client_id": config.CLIENT_ID,
            "client_secret": config.CLIENT_SECRET,
            "redirect_uri": config.REDIRECT_URI,
            "grant_type": "authorization_code",
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(config.GOOGLE_TOKEN_URL, data=data)
            tokens = response.json()

        if "error" in tokens:
            raise HTTPException(status_code=400, detail=f"Google OAuth error: {tokens}")

        if "access_token" not in tokens:
            raise HTTPException(
                status_code=400, detail=f"No access_token in response: {tokens}"
            )

        return tokens["access_token"]

    async def get_user_data(self, access_token: str) -> dict:
        headers = {"Authorization": f"Bearer {access_token}"}

        async with httpx.AsyncClient() as client:
            user_data = await client.get(config.GOOGLE_USERINFO_URL, headers=headers)
            user_data = user_data.json()

        logger.info(f"Google userinfo response: {user_data}")

        try:
            return {
                "google_id": user_data["id"],
                "email": user_data["email"],
                "name": user_data["name"],
            }
        except KeyError:
            raise HTTPException(400, "Invalid Google response format")

    def get_auth_url(self) -> str:
        query = {
            "client_id": config.CLIENT_ID,
            "redirect_uri": config.REDIRECT_URI,
            "response_type": "code",
            "scope": " ".join(["email", "openid", "profile"]),
            "access_type": "offline",
        }

        query_string = urllib.parse.urlencode(query, quote_via=urllib.parse.quote)
        auth_url = f"{config.GOOGLE_AUTH_URL}?{query_string}"
        return f"{config.GOOGLE_AUTH_URL}?{query_string}"
