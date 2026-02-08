from abc import ABC, abstractmethod
class IOAuthProvider(ABC):
    @abstractmethod
    async def exchange_code(self, code: str) -> str:
        pass

    @abstractmethod
    async def get_user_data(self, access_token: str) -> dict:
        pass

    @abstractmethod
    def get_auth_url(self) -> str:
        pass

