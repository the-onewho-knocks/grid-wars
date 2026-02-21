# ⚔ GRID WAR — Frontend

Real-time territory domination game frontend built with **React 18 + Vite + Zustand**.

---

## 🗂 Project Structure

```
grid-war-frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Header.jsx          # Top bar: stats, player badge, WS status
│   │   ├── LeftPanel.jsx       # Player info + combat log
│   │   ├── TileGrid.jsx        # Main 40×25 game grid (1000 tiles)
│   │   ├── RightPanel.jsx      # Leaderboard + minimap + battle stats
│   │   ├── RegisterModal.jsx   # Fullscreen registration overlay
│   │   └── Notifications.jsx   # Toast notification system
│   ├── hooks/
│   │   ├── useWebSocket.js     # WS connection with auto-reconnect
│   │   ├── useTiles.js         # Tile fetch + capture (optimistic updates)
│   │   └── useLeaderboard.js   # Leaderboard polling every 12s
│   ├── store/
│   │   └── useGameStore.js     # Zustand global state (persists player)
│   ├── styles/
│   │   └── global.css          # CSS variables, animations, base styles
│   ├── utils/
│   │   └── api.js              # Typed API wrapper for all endpoints
│   ├── App.jsx                 # Root layout + hook orchestration
│   └── main.jsx                # React DOM entry point
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080
```

### 3. Start dev server

```bash
npm run dev
```

Opens at **http://localhost:5173**

### 4. Build for production

```bash
npm run build
```

Output in `dist/` — deploy to Netlify, Vercel, or any static host.

---

## 🌐 API Integration

| Endpoint         | Method | Used in             |
|------------------|--------|---------------------|
| `/register`      | POST   | RegisterModal        |
| `/tiles`         | GET    | useTiles hook        |
| `/capture`       | POST   | useTiles hook        |
| `/leaderboard`   | GET    | useLeaderboard hook  |
| `/ws?user_id=`   | WS     | useWebSocket hook    |

### WebSocket message format supported:
```json
{ "tile_id": 42, "owner_id": "abc", "name": "Commander", "color": "#FF2B2B" }
```

---

## 🎮 Features

- **1000-tile live grid** — 40×25, click any tile to capture it
- **Real-time WebSocket** — instant broadcast of other players' moves
- **Optimistic UI** — your captures reflect immediately, rollback on error
- **Auto-reconnect WS** — exponential backoff up to 30s
- **Leaderboard** — polls every 12s, shows rank bars and your rank badge
- **Minimap** — full 1000-tile territory overview in right panel
- **Combat log** — color-coded event feed (own/enemy/system)
- **Player persistence** — localStorage keeps you logged in on refresh
- **Toast notifications** — success/error/warn/info variants
- **Responsive tile sizing** — grid auto-scales to fill available space

---

## 🏗 Production Deployment

### Netlify (recommended)

1. `npm run build`
2. Deploy `dist/` folder to Netlify
3. Set env vars in Netlify dashboard:
   - `VITE_API_URL=https://your-backend.railway.app`
   - `VITE_WS_URL=wss://your-backend.railway.app`

### CORS

Your Go backend already allows `https://grid-wars-inboxkit.netlify.app`. Update the list if your Netlify URL changes.

---

## 🛠 Dependencies

| Package         | Version  | Purpose                     |
|-----------------|----------|-----------------------------|
| react           | ^18.2.0  | UI framework                |
| react-dom       | ^18.2.0  | DOM renderer                |
| zustand         | ^4.5.2   | Global state management     |
| clsx            | ^2.1.1   | Conditional className util  |
| vite            | ^5.2.0   | Build tool & dev server     |
| @vitejs/plugin-react | ^4.2.1 | React fast refresh       |
