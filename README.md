# 🏒⚡ Sports Bingo Battle — v0.2.0-alpha

> **Multiplayer sports bingo** with AI-generated cards, live NHL feed, Battleship attacks, bot competitors, camera verification, and full team colors.

Built for iOS + Android mobile browsers (PWA). No app store needed.

---

## ✨ Feature Overview

| Feature | How it works |
|---|---|
| **✨ AI-Generated Squares** | Claude generates unique, matchup-specific squares for every game |
| **🏒 NHL Live Feed** | Polls the public NHL API every 20s — events auto-mark squares |
| **🎨 Team Colors** | Your card uses your team's real primary/secondary hex colors |
| **💣 Battle Shots** | Complete BINGO with a ⚡ square → block an opponent's square |
| **🤖 AI Bot Competitors** | 1–3 bots with strategic AI, realistic delays, idle crowd marks |
| **📷 Camera Verification** | Crowd/atmosphere squares at live games require a photo verified by Claude Vision |
| **💾 Saved Preferences** | Name, team, sport, and location auto-save to localStorage |
| **🔴 Real-time multiplayer** | Firebase Realtime Database syncs all cards live |
| **📱 PWA** | Works in any mobile browser — add to home screen for app feel |

---

## Supported Sports & Teams

| Sport | Teams | Live Feed |
|---|---|---|
| 🏒 NHL Hockey | All 32 teams with real hex colors | ✅ Auto-marks squares |
| 🏈 NFL | All 32 teams | Manual only |
| 🏀 NBA | All 30 teams | Manual only |

---

## Quick Start (15 minutes)

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/sports-bingo-battle.git
cd sports-bingo-battle
npm install
```

### 2. Firebase setup (free)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. **Create project** → any name → disable Google Analytics (optional)
3. Left sidebar → **Build → Realtime Database** → **Create Database**
   - Choose nearest region
   - Start in **test mode** (you can add security rules later)
4. Left sidebar → **Project Settings** ⚙️ → **Your apps** → click **`</>`** (Web)
5. Register app (any nickname) → copy the `firebaseConfig` values

### 3. Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. **API Keys** → **Create Key** → copy it
3. Used server-side only — never exposed to the browser

### 4. Environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Firebase
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abc123

# Anthropic — SERVER SIDE ONLY (no VITE_ prefix)
ANTHROPIC_API_KEY=sk-ant-...
```

### 5. Run locally

```bash
# Start both the Vite frontend and the local API server:
npm run dev:all

# Or separately:
npm run dev       # Vite on http://localhost:5173
npm run dev:api   # Express API on http://localhost:3001
```

Open `http://localhost:5173`. On the same Wi-Fi, other phones can use your local IP.

---

## Deploying to Vercel (free, public URL)

```bash
npm install -g vercel
npm run build
vercel
```

Then in the **Vercel dashboard → your project → Settings → Environment Variables**, add:

| Name | Value | Environment |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Production + Preview |
| All `VITE_FIREBASE_*` vars | your values | Production + Preview |

Redeploy after adding env vars. Your app will be live at `https://your-project.vercel.app`.

---

## How to Play

1. **Create a room** — pick sport, your team, where you're watching, and optional bot count
2. **Share the 4-letter code** — friends join and each pick their own team
3. Each player gets a **unique AI-generated card** in their team's colors
4. **Tap squares** when events happen during the game
5. ⚡ **Battle squares** have an orange border — complete BINGO with one to earn a 💣 **Battle Shot**
6. Use **Battle Shots** to block one of an opponent's unmarked squares
7. 📷 **Camera squares** (dashed gold border) require taking a photo at live games — Claude's AI referee verifies the photo
8. 🤖 **Bots** automatically mark squares and strategically fire Battle Shots at you
9. **First BINGO wins!**

---

## Architecture

```
sports-bingo-battle/
├── api/
│   ├── generate-squares.js   ← Vercel serverless: Claude generates card squares
│   └── verify-camera.js      ← Vercel serverless: Claude Vision verifies photos
│
├── src/
│   ├── App.jsx               ← Root: game state, Firebase sync, NHL feed wiring
│   │
│   ├── components/
│   │   ├── Lobby.jsx         ← Create/join, team picker, preferences, bot selector
│   │   ├── WaitingRoom.jsx   ← Pre-game lobby, player list, bot list
│   │   ├── GameBoard.jsx     ← Main game: card grid, header, opponent progress
│   │   ├── BingoSquare.jsx   ← Individual square with team colors, icons
│   │   ├── BattleModal.jsx   ← Battle Shot targeting: pick player + square
│   │   ├── CameraVerifyModal.jsx  ← Camera capture + AI referee flow
│   │   ├── WinScreen.jsx     ← Victory/defeat with team colors
│   │   └── ToastContainer.jsx
│   │
│   ├── data/
│   │   ├── bingoSquares.js   ← Static square pools, card generator, bingo checker
│   │   ├── teamColors.js     ← NHL/NFL/NBA team colors (primary + secondary hex)
│   │   ├── nhlEventMap.js    ← NHL API event → bingo square text patterns
│   │   └── botPlayers.js     ← Bot player factory + simple tick logic
│   │
│   ├── hooks/
│   │   ├── useNHLFeed.js     ← Polls NHL API, returns auto-mark triggers
│   │   ├── useLLMSquares.js  ← Calls /api/generate-squares with static fallback
│   │   ├── useCamera.js      ← Camera stream, photo capture, Claude verification
│   │   └── useAIPlayer.js    ← Sophisticated bot AI: feed reaction, idle marks,
│   │                            strategic battle shots targeting closest-to-bingo player
│   │
│   ├── services/
│   │   ├── preferences.js    ← localStorage save/load for name, team, sport, location
│   │   ├── llmSquareGen.js   ← Direct Claude API client (dev/fallback use)
│   │   └── cameraVerify.js   ← Direct Claude Vision client (dev/fallback use)
│   │
│   ├── firebase.js           ← Firebase init from .env
│   └── styles/App.css        ← All styles: dark theme, team colors, animations
│
├── dev-server.js             ← Local Express server for API routes (dev only)
├── vercel.json               ← Vercel deployment config
├── vite.config.js            ← Vite + dev proxy to local API server
└── .env.example              ← Template for environment variables
```

---

## Bot AI Details (`useAIPlayer.js`)

Bots are driven by the host's device to minimize Firebase writes:

- **Feed reaction**: When NHL events come in, bots apply the same auto-mark patterns with a ~15% miss rate and a random 0.8–4.5s human-like delay
- **Idle marks**: Every 40–100 seconds, each bot marks a random unmarked square (simulating crowd/atmosphere observation)
- **Strategic Battle Shots**: When a bot earns a Battle Shot, it targets the human player with the most marked squares and blocks their square that's most dangerous (highest sum of already-marked squares in the same bingo line)

---

## Camera Squares

At **live games** and **sports bars**, AI-generated cards include 📷 camera squares (dashed gold border).

Tapping one opens:
1. **Live camera view** (rear camera, optimized for scene capture)
2. **Snap** → photo preview
3. **Verify It** → Claude Vision analyzes the photo against the square text
4. **AI Referee** responds with: `verified: true/false`, confidence score, and a one-sentence explanation
5. Verified → square is marked. Not verified → retry or skip.

If the camera or API is unavailable, the modal offers a "Mark Anyway" fallback.

---

## Roadmap

- [ ] NFL / NBA live feeds (ESPN or SportsRadar)
- [ ] Push notifications for Battle Shots
- [ ] Game history & win stats
- [ ] Custom square editor
- [ ] Voice announcements on auto-marks
- [ ] Spectator / watch-only mode
- [ ] Firebase security rules for production hardening

---

## License

MIT — free to use, modify, and share.
