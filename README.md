# MistGuess

**MistGuess** is a real-time multiplayer geoguessr clone with matchmaking system and competitive gameplay. Players compete to guess locations on google street view, earning points based on accuracy and speed.

the platform features skill based matchmaking, XP progression with ranks, and real time webSocket communication for multiplayer experience.

> **Note:** Frontend was generated with LLM for demonstration purposes.

## Features

- **real-time multiplayer** - WebSocket based gameplay with instant updates
- **matchmaking system** - skill based queue matching players by xp
- **lobby system** - create/join lobbies with invite codes
- **xp | ranks** - progression system ranks
- **google OAuth** - login with gmail
- **telegram integration** - connect account and receive notifications
- **hp combat** - guess accuracy deals damage to opponent
- **reconnection support** - rejoin games after disconnect
- **admin panel** - manage locations and users

## tech

### backend
- **FastAPI** - web framework
- **SQLAlchemy 2.0** - async orm
- **PostgreSQL** - database
- **Redis** - game state cache
- **RabbitMQ** - message queue for notifications
- **WebSockets** -  communication
- **Pydantic** - validation

### bot
- **aiogram 3.x** - telegram bot framework
- **aio-pika** - rabbitmq client

### authentication
- **Google OAuth** - login with google
- **Telegram Bot Auth** - account linking
- **JWT Tokens** - access token

### infrastructure
- **Docker & Docker Compose** - containerization

## setup

### configuration

1. copy `.env.example` to `.env`:

```bash
cp api/.env.example api/.env
```

2. update `.env` with your credentials

3. configure google OAuth:
   - create project in [google cloud console](https://console.cloud.google.com/)
   - enable google+ api
   - create OAuth 2.0 credentials
   - add redirect url: `http://localhost:5173/auth/google/callback`

4. configure telegram bot (optional):
   - message @BotFather in telegram
   - send `/newbot` and follow instructions
   - copy bot token to `.env` as `TELEGRAM_TOKEN`

### run with Docker

```bash
docker-compose up --build
```



## structure

```
mistguess/
├── api/
│   ├── models/                   # sqlalchemy models
│   │   ├── user.py               
│   │   ├── lobby.py             
│   │   └── locations.py         
│   ├── routers/                  # api endpoints
│   │   ├── authorization_router.py  # google OAuth
│   │   ├── lobby_router.py          # lobby
│   │   ├── websocket_router.py      # game WebSocket
│   │   ├── matchmaking_router.py    # matchmaking queue
│   │   ├── profile_router.py        # user profiles
│   │   └── admin_router.py          # admin endpoints
│   ├── services/                 # logic
│   │   ├── websocket_service.py     # game state
│   │   ├── matchmaking_service.py   # queue and matching
│   │   └── authorization.py         # jwt, OAuth
│   ├── repositories/             # db access layer
│   │   ├── user_repository.py
│   │   ├── lobby_repository.py
│   │   └── location_repository.py
│   ├── cache/                    # redis client
│   ├── database/                 # sqlalchemy config
│   ├── tests/                    # pytest tests
│   ├── dockerfile               # api container
│   └── main.py                   # api entrypoint
├── bot/
│   ├── handlers/                # telegram handlers
│   │   └── notification_handler.py
│   ├── main.py                  # bot entrypoint
│   └── Dockerfile
└── docker-compose.yml
```

## License

MIT
