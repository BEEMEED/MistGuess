from cache.redis import r
from fastapi import HTTPException, Request
from starlette.status import HTTP_429_TOO_MANY_REQUESTS
from functools import wraps

def rate_limit(max_requests: int, seconds: int):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = kwargs.get("request") or kwargs.get("req")
            if not request or not hasattr(request, "client") or not request.client:
                return await func(*args, **kwargs)

            ip = request.client.host
            key = f"rl:{func.__name__}:{ip}"

            count = await r.incr(key)
            if count == 1:
                await r.expire(key, seconds)

            if count > max_requests:
                raise HTTPException(status_code=HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests")

            return await func(*args, **kwargs)
        return wrapper
    return decorator
