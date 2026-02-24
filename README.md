# MistGuess

**MistGuess** is a real-time multiplayer geoguessr clone with matchmaking system and competitive gameplay. Players compete to guess locations on google street view, earning points based on accuracy and speed.

the platform features skill based matchmaking, XP progression with ranks, clan system with asynchronous 5v5 clan wars, and real time webSocket communication for multiplayer experience.

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
- **spectator mode** - watch ongoing games live with real-time camera and position sync
- **admin panel** - manage locations and users
- **orders (clans)** - closed clans with invite system
- **oredrs wars** - asynchronous 5v5 battles between clans
- **order ranks** - progression via clan xp
- **reputation system** - track clan reliability

## tech

### backend
- **FastAPI** - web framework
- **SQLAlchemy 2.0** - async orm
- **PostgreSQL** - database
- **Redis** - game state cache
- **RabbitMQ** - message queue for notifications
- **WebSockets** -  communication
- **Pydantic** - validation
- **Alembic** - database migrations

### bot
- **aiogram 3.x** - telegram bot framework
- **aio-pika** - rabbitmq client

### authentication
- **Google OAuth** - login with google
- **Telegram Bot Auth** - account linking
- **JWT Tokens** - access token

### infrastructure
- **Docker & Docker Compose** - containerization

### monitoring
- **Sentry** - error tracking
- **Rate Limiting** - redis based request throttling



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

4. **configure telegram bot (optional):**
   - Message [@BotFather](https://t.me/BotFather) in Telegram
   - Send `/newbot` and follow instructions
   - Copy bot token to `.env` as `TELEGRAM_TOKEN`

5. **configure sentry (optional):**
   - sign up at [sentry.io](https://sentry.io)
   - create new project (python/fastapi)
   - copy dsn to `.env` as `DSN`

### run with docker

```bash
docker-compose up --build
```

## structure

```
mistguess/
├── api/
│   ├── alembic/                  # database migrations
│   │   └── versions/             # migration files
│   ├── core/                     # core functionality
│   │   └── monitoring.py         # sentry configuration
│   ├── models/                   # sqlalchemy models
│   │   ├── user.py               # user model with XP/ranks
│   │   ├── lobby.py              # lobby/game model
│   │   └── locations.py          # game locations
│   ├── routers/                  # api endpoints
│   │   ├── authorization_router.py  # google OAuth, jwt
│   │   ├── lobby_router.py          # lobby crud
│   │   ├── websocket_router.py      # game websocket
│   │   ├── matchmaking_router.py    # matchmaking queue
│   │   ├── profile_router.py        # user profiles
│   │   ├── telegram.py              # telegram integration
│   │   └── admin_router.py          # admin panel
│   ├── services/                 # logic
│   │   ├── websocket_service.py     # game state
│   │   ├── matchmaking_service.py   # queue and matching
│   │   └── authorization.py         # jwt, OAuth handlers
│   ├── repositories/             # database access layer
│   │   ├── user_repository.py
│   │   ├── lobby_repository.py
│   │   └── location_repository.py
│   ├── utils/                    # utilities
│   │   ├── rate_limiter.py          # rate limiting decorator
│   │   └── dependencies.py          # fastapi dependencies
│   ├── cache/                    # redis client
│   ├── database/                 # database configuration
│   ├── tests/                    # tests
│   ├── Dockerfile                # api container
│   ├── alembic.ini               # alembic configuration
│   └── main.py                   # api entrypoint
├── bot/
│   ├── handlers/                 # telegram handlers
│   │   └── notification_handler.py
│   ├── main.py                   # bot entrypoint
│   └── Dockerfile
└── docker-compose.yml            # service orchestration
```

## License

MIT
