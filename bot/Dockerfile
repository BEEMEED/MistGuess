FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir aiogram aiohttp aio-pika python-dotenv

COPY . .

CMD ["python", "main.py"]
