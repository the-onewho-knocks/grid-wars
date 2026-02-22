# Grid Wars Frontend

Real-time territory control game frontend built with React + Vite.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (connects to production backend by default)
npm run dev
```

Open http://localhost:5173

## Switching to Local Backend

1. Make sure your Go backend is running on port 8080
2. Open `src/GridWars.jsx` and change line 3:
```js
// Change this:
const API_BASE = "https://grid-wars-inboxkit.netlify.app";

// To this:
const API_BASE = "http://localhost:8080";
```

## Build for Production

```bash
npm run build
# Output goes to /dist — deploy that folder to Netlify/Vercel/etc.
```

## API Endpoints Used

| Method | Endpoint       | Description                  |
|--------|---------------|------------------------------|
| GET    | /tiles        | Fetch all 1000 tiles         |
| GET    | /leaderboard  | Fetch leaderboard rankings   |
| POST   | /register     | Register a new user          |
| POST   | /capture      | Capture a tile               |
| WS     | /ws           | Real-time tile update stream |

## Project Structure

```
grid-wars-frontend/
├── index.html          # HTML entry point
├── vite.config.js      # Vite configuration
├── package.json        # Dependencies
├── public/
│   └── favicon.svg     # Grid Wars favicon
└── src/
    ├── main.jsx        # React entry point
    └── GridWars.jsx    # Main app (single file — all components + styles)
```
