// src/utils/api.js

// Single env var: VITE_BACKEND_URL drives both REST and WebSocket
const BASE =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8080';

// Auto-derive WebSocket URL: https → wss, http → ws
function toWsUrl(url) {
  return url
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://');
}

export const WS_BASE =
  import.meta.env.VITE_WS_URL || toWsUrl(BASE);

// ─── Request helper ──────────────────────────────────────────────────────────

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

// ─── API surface (mirrors Go routes) ─────────────────────────────────────────

export const api = {
  register:       (name, color)      => request('POST', '/register',    { name, color }),
  getTiles:       ()                 => request('GET',  '/tiles'),
  capture:        (user_id, tile_id) => request('POST', '/capture',     { user_id, tile_id }),
  getLeaderboard: ()                 => request('GET',  '/leaderboard'),
  health:         ()                 => request('GET',  '/health'),
};
