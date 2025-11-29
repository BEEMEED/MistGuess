# MistGuess

GeoGuessr clone with real-time multiplayer gameplay, matchmaking system

### frontend built with LLM for demo

```bash
npm install
cp .env.example .env
```

Edit `.env` with your urls

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

### backend

```bash
cd geoguessr_api
pip install -r requirements.txt
cp .env.example .env
```

edit `geoguessr_api/.env`

```env
SECRET_KEY=your-secret-key-here
CLIENT_ID=your-google-client-id
CLIENT_SECRET=your-google-client-secret
TELEGRAM_TOKEN=your-telegram-bot-token
REDIRECT_URI=http://localhost:5173/auth/google/callback
```
