# JARVIS AI Assistant — Setup Guide

## What you're building
A Jarvis-like AI personal assistant PWA (Progressive Web App) that:
- Understands Hindi + English automatically
- Speaks back to you in the same language
- Manages your tasks and sends reminders
- Does deep research on any topic
- Works as an installed app on your Android phone
- Runs on a 100% free stack

---

## Step 1 — Get your free API keys

### A) Groq API (AI Brain) — FREE
1. Go to https://console.groq.com
2. Sign up with Google
3. Click "API Keys" → "Create API Key"
4. Copy the key → paste in `backend/.env` as `GROQ_API_KEY`

### B) OpenWeatherMap (Weather) — FREE
1. Go to https://openweathermap.org/api
2. Sign up → go to "My API Keys"
3. Copy your key → paste in `backend/.env` as `WEATHER_API_KEY`

### C) Supabase (Database) — FREE
1. Go to https://supabase.com → New Project
2. Choose a name and password
3. Go to Settings → API
4. Copy "Project URL" → `SUPABASE_URL`
5. Copy "anon public" key → `SUPABASE_ANON_KEY`
6. Go to SQL Editor → paste the SQL from `backend/db/supabase.js` comments → Run

---

## Step 2 — Generate VAPID keys (for push notifications)

Run this once in the backend folder:
```bash
cd backend
npm install
node -e "const webpush = require('web-push'); const keys = webpush.generateVAPIDKeys(); console.log(keys);"
```
Copy `publicKey` → `VAPID_PUBLIC_KEY` in both backend `.env` and frontend `.env`
Copy `privateKey` → `VAPID_PRIVATE_KEY` in backend `.env`

---

## Step 3 — Set up backend

```bash
cd backend
cp .env.example .env
# Fill in all keys in .env
npm install
npm run dev
```
Backend runs at http://localhost:5000
Test it: open http://localhost:5000/health — you should see: `{"status":"Jarvis online"}`

---

## Step 4 — Set up frontend

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000
# Set VITE_VAPID_PUBLIC_KEY= (same as backend)
npm install
npm run dev
```
Frontend runs at http://localhost:5173
Open in Chrome on your phone or desktop.

---

## Step 5 — Test Jarvis locally

1. Open http://localhost:5173 in Chrome
2. Allow microphone when prompted
3. Say **"Hi Jarvis"** — Jarvis should greet you in English
4. Say **"Jarvis"** — Jarvis should reply in Hindi
5. Say **"Research karo AI ke baare mein"** — research should run
6. Say **"Remind me to call mom at 7pm"** — task should be saved

---

## Step 6 — Deploy for free (so it works on your phone anywhere)

### Deploy Backend → Render
1. Push your code to GitHub
2. Go to https://render.com → New Web Service
3. Connect your GitHub repo → select `backend` folder
4. Set build command: `npm install`
5. Set start command: `node server.js`
6. Add all environment variables from `.env`
7. Deploy → copy the URL (e.g. https://jarvis-backend.onrender.com)

### Keep Render awake (free trick)
1. Go to https://uptimerobot.com → Sign up free
2. Add new monitor → HTTP(s) → paste your Render URL + `/health`
3. Set interval: every 5 minutes
4. Done — backend stays awake 24/7

### Deploy Frontend → Vercel
1. Go to https://vercel.com → Import your GitHub repo
2. Select `frontend` folder as root
3. Add env variable: `VITE_API_URL` = your Render backend URL
4. Deploy → you get a URL like https://jarvis.vercel.app

---

## Step 7 — Install as app on Android

1. Open https://jarvis.vercel.app in Chrome on your Android
2. Tap the 3 dots menu → "Add to Home Screen"
3. Jarvis is now installed as an app icon
4. Allow notifications when prompted (for reminders)

---

## Project Structure

```
jarvis/
├── backend/
│   ├── routes/
│   │   ├── jarvis.js        ← AI chat, greet, research
│   │   ├── tasks.js         ← CRUD for tasks
│   │   ├── weather.js       ← OpenWeatherMap
│   │   ├── contacts.js      ← Call contacts
│   │   └── notifications.js ← Push notifications
│   ├── middleware/
│   │   └── reminderCron.js  ← Runs every minute, checks reminders
│   ├── db/supabase.js       ← DB connection + SQL schema
│   └── server.js            ← Main Express app
│
└── frontend/
    ├── src/
    │   ├── hooks/
    │   │   ├── useJarvis.js  ← Main brain — connects everything
    │   │   └── useSpeech.js  ← Voice recognition + synthesis
    │   ├── components/
    │   │   ├── Orb.jsx       ← Animated J orb
    │   │   ├── WaveBar.jsx   ← Sound wave animation
    │   │   ├── ChatBubble.jsx
    │   │   ├── MicButton.jsx
    │   │   ├── InfoChips.jsx ← Weather/tasks strip
    │   │   ├── LangBadge.jsx ← EN/HI indicator
    │   │   ├── StatusLabel.jsx
    │   │   ├── CallModal.jsx ← Tap-to-call popup
    │   │   └── BottomNav.jsx
    │   ├── pages/
    │   │   ├── Home.jsx      ← Main chat screen
    │   │   ├── Tasks.jsx     ← Task manager
    │   │   ├── Research.jsx  ← Research agent
    │   │   └── Settings.jsx  ← Contacts + notifications
    │   └── services/api.js   ← All API calls
    └── vite.config.js        ← PWA config
```

---

## How language detection works

No extra API needed. The system prompt tells Groq:
- If user message is in English → reply in English
- If user message is in Hindi or Hinglish → reply in Hindi

The orb changes colour automatically:
- 🔵 Blue = English mode
- 🟠 Orange = Hindi mode
- 🟢 Green = Research mode

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Mic not working | Must use Chrome. Allow mic permission. |
| Jarvis not hearing wake word | Chrome tab must be active |
| Backend sleeping | Set up UptimeRobot (Step 6) |
| Hindi voice sounds wrong | Go to Android Settings → TTS → install Hindi voice pack |
| Supabase error | Check your SQL schema was run correctly |

---

## Total cost: ₹0/month
All services used are on free tiers.
