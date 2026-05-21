import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const API_BASE = "https://grid-wars-production-8354.up.railway.app";

const GRID_COLS = 40;
const GRID_ROWS = 25;
const TOTAL_TILES = 1000;
const CAPTURE_COOLDOWN = 2;
const STEAL_THRESHOLD = 5;

const PRESET_COLORS = [
  "#FF2D55", "#FF9500", "#FFCC00", "#34C759", "#00C7BE",
  "#007AFF", "#5856D6", "#AF52DE", "#FF6B6B",  "#C34A36",
  "#2C73D2", "#008E9B", "#FFC75F", "#F24C4C", "#5DD39E",
];

function darken(hex, amount = 40) {
  let r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  let g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  let b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function stealAllowance(claimedCount) {
  return Math.floor(claimedCount / STEAL_THRESHOLD);
}

// ── Mobile tile size: fixed 16px so tiles are tappable; grid scrolls
// ── Desktop tile size: calculated to fill available space
const MOBILE_TILE_SIZE = 16;
// Max drag distance (px) to still count as a tap (not a scroll)
const TAP_THRESHOLD = 8;

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #020408;
    --surface: #0a0f1a;
    --surface2: #0f1520;
    --border: #1a2535;
    --accent: #00f0ff;
    --accent2: #ff2d55;
    --gold: #FFD700;
    --silver: #C0C0C0;
    --bronze: #CD7F32;
    --steal: #ff9500;
    --text: #e8f4f8;
    --muted: #4a6380;
    --grid-line: rgba(0, 240, 255, 0.06);
    --tab-h: 60px;
    --header-h: 52px;
  }

  html { height: 100%; }
  body {
    height: 100%; background: var(--bg); color: var(--text);
    font-family: 'Share Tech Mono', monospace;
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    /* Prevent iOS rubber-band scroll on body */
    overscroll-behavior: none;
  }
  #root { height: 100%; }

  .scanline {
    position: fixed; inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px);
    pointer-events: none; z-index: 1000;
  }

  .app {
    display: grid;
    grid-template-rows: var(--header-h) 1fr 32px;
    grid-template-columns: 260px 1fr 240px;
    grid-template-areas:
      "header header header"
      "sidebar-left grid sidebar-right"
      "footer footer footer";
    height: 100vh;
  }

  .header {
    grid-area: header;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 20px; height: var(--header-h);
    background: var(--surface); border-bottom: 1px solid var(--border);
    position: relative; z-index: 10; gap: 8px;
  }
  .header::after {
    content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent); opacity: 0.5;
  }
  .logo {
    font-family: 'Orbitron', sans-serif; font-weight: 900; font-size: 20px; letter-spacing: 3px;
    background: linear-gradient(135deg, var(--accent), #007aff);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; flex-shrink: 0;
  }
  .logo span { -webkit-text-fill-color: var(--accent2); }
  .header-center { display: flex; align-items: center; gap: 12px; }
  .header-right  { display: flex; align-items: center; gap: 10px; }

  .ws-indicator { display: flex; align-items: center; gap: 5px; font-size: 10px; color: var(--muted); letter-spacing: 1px; }
  .ws-dot { width: 6px; height: 6px; border-radius: 50%; background: #666; flex-shrink: 0; }
  .ws-dot.connected    { background: #34c759; box-shadow: 0 0 6px #34c759; animation: pulse 2s infinite; }
  .ws-dot.disconnected { background: var(--accent2); }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

  .cooldown-badge {
    display: flex; align-items: center; gap: 8px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 3px; padding: 4px 10px; font-size: 10px; letter-spacing: 1px;
  }
  .cooldown-badge.ready   { border-color: #34c759; color: #34c759; }
  .cooldown-badge.waiting { border-color: var(--accent2); color: var(--accent2); }
  .cooldown-num { font-family: 'Orbitron', sans-serif; font-size: 14px; font-weight: 900; }

  .cooldown-ring { position: relative; flex-shrink: 0; }
  .cooldown-ring svg { display: block; transform: rotate(-90deg); }
  .cooldown-ring .track    { fill: none; stroke: var(--border); stroke-width: 3; }
  .cooldown-ring .progress { fill: none; stroke: var(--accent2); stroke-width: 3; stroke-linecap: round; transition: stroke-dashoffset 0.1s linear; }
  .cooldown-ring .progress.ready { stroke: #34c759; }
  .cooldown-ring-label {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-family: 'Orbitron', sans-serif; font-size: 8px; font-weight: 700; color: var(--accent2);
  }
  .cooldown-ring-label.ready { color: #34c759; }

  .sidebar {
    padding: 14px; background: var(--surface);
    overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--border) transparent;
  }
  .sidebar::-webkit-scrollbar { width: 3px; }
  .sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  .sidebar-left  { grid-area: sidebar-left;  border-right: 1px solid var(--border); }
  .sidebar-right { grid-area: sidebar-right; border-left:  1px solid var(--border); }

  .section-title {
    font-family: 'Orbitron', sans-serif; font-size: 9px; font-weight: 700;
    letter-spacing: 3px; color: var(--muted); text-transform: uppercase;
    margin-bottom: 10px; display: flex; align-items: center; gap: 8px;
  }
  .section-title::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, var(--border), transparent); }

  .player-card {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 4px; padding: 12px; margin-bottom: 14px;
    position: relative; overflow: hidden;
  }
  .player-card::before {
    content: ''; position: absolute; top: 0; left: 0; width: 3px; height: 100%;
    background: var(--player-color, var(--accent));
  }
  .player-name  { font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 700; color: var(--player-color, var(--accent)); margin-bottom: 4px; }
  .player-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
  .stat         { text-align: center; }
  .stat-value   { font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 900; color: var(--accent); }
  .stat-label   { font-size: 8px; letter-spacing: 2px; color: var(--muted); margin-top: 2px; }

  .steal-card {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 4px; padding: 10px 12px; margin-bottom: 14px;
    position: relative; overflow: hidden;
  }
  .steal-card::before {
    content: ''; position: absolute; top: 0; left: 0; width: 3px; height: 100%;
    background: var(--steal);
  }
  .steal-card.has-steals { border-color: rgba(255,149,0,0.4); }
  .steal-card-title {
    font-family: 'Orbitron', sans-serif; font-size: 8px; font-weight: 700;
    letter-spacing: 2px; color: var(--steal); margin-bottom: 8px;
    display: flex; align-items: center; gap: 6px;
  }
  .steal-slots { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
  .steal-slot {
    width: 18px; height: 18px; border-radius: 2px; border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center; font-size: 9px;
    transition: all 0.2s;
  }
  .steal-slot.filled    { background: var(--steal); border-color: var(--steal); color: var(--bg); }
  .steal-slot.empty-slot{ background: transparent; color: var(--muted); }
  .steal-slot.locked    { background: transparent; border-style: dashed; color: var(--muted); opacity: 0.4; }
  .steal-progress-row   { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
  .steal-progress-bar   { flex: 1; height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; }
  .steal-progress-fill  { height: 100%; background: var(--steal); border-radius: 2px; transition: width 0.4s ease; }
  .steal-progress-label { font-size: 8px; color: var(--muted); letter-spacing: 1px; white-space: nowrap; }

  .btn {
    width: 100%; padding: 9px;
    font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 2px;
    border: 1px solid var(--accent); background: transparent; color: var(--accent);
    cursor: pointer; border-radius: 2px; transition: all 0.2s; text-transform: uppercase;
    -webkit-tap-highlight-color: transparent;
  }
  .btn:hover:not(:disabled)  { background: var(--accent); color: var(--bg); box-shadow: 0 0 20px rgba(0,240,255,0.4); }
  .btn:active:not(:disabled) { transform: scale(0.97); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn.danger { border-color: var(--accent2); color: var(--accent2); }
  .btn.danger:hover:not(:disabled) { background: var(--accent2); color: var(--bg); }

  .field { margin-bottom: 12px; }
  .field label { display: block; font-size: 9px; letter-spacing: 2px; color: var(--muted); margin-bottom: 5px; }
  .field input {
    width: 100%; background: var(--bg); border: 1px solid var(--border);
    border-radius: 2px; color: var(--text);
    font-family: 'Share Tech Mono', monospace;
    font-size: 16px;
    padding: 10px; outline: none; transition: border-color 0.2s;
  }
  .field input:focus { border-color: var(--accent); }

  .color-picker { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 12px; }
  .color-swatch {
    width: 100%; aspect-ratio: 1; border-radius: 3px; cursor: pointer;
    border: 2px solid transparent; transition: transform 0.15s, border-color 0.15s;
  }
  .color-swatch:hover    { transform: scale(1.12); }
  .color-swatch.selected { border-color: white; transform: scale(1.08); }

  .leaderboard { display: flex; flex-direction: column; gap: 4px; }
  .lb-entry {
    display: flex; align-items: center; gap: 8px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 3px; padding: 7px 8px;
    position: relative; overflow: hidden; transition: border-color 0.2s;
  }
  .lb-entry.me { border-color: var(--accent); }
  .lb-bar  { position: absolute; left: 0; top: 0; height: 100%; opacity: 0.08; transition: width 0.5s ease; }
  .lb-rank { font-family: 'Orbitron', sans-serif; font-size: 9px; font-weight: 700; color: var(--muted); min-width: 18px; }
  .lb-dot  { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .lb-name { flex: 1; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lb-count { font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 700; color: var(--accent); }

  /* ── Grid area ── */
  .grid-area {
    grid-area: grid;
    display: flex; align-items: center; justify-content: center;
    background: var(--bg); overflow: hidden; position: relative;
    background-image:
      linear-gradient(var(--grid-line) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
    background-size: 40px 40px;
  }

  /* ── Scroll wrapper: fills grid-area, scrollable in both axes ── */
  .grid-scroll-wrap {
    width: 100%; height: 100%;
    overflow: auto;
    /* Use pan gestures so touch-scroll works when finger starts on a tile */
    touch-action: pan-x pan-y;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
    /* Scroll-shadow overlays (pure CSS, no extra elements) */
    background:
      linear-gradient(to right, var(--bg) 0%, transparent 24px)  left   / 24px 100% no-repeat,
      linear-gradient(to left,  var(--bg) 0%, transparent 24px)  right  / 24px 100% no-repeat,
      linear-gradient(to bottom,var(--bg) 0%, transparent 20px)  top    / 100% 20px no-repeat,
      linear-gradient(to top,   var(--bg) 0%, transparent 20px)  bottom / 100% 20px no-repeat;
    background-color: var(--bg);
    background-attachment: local, local, local, local;
  }
  .grid-scroll-wrap::-webkit-scrollbar { width: 3px; height: 3px; }
  .grid-scroll-wrap::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .grid-inner { padding: 12px; flex-shrink: 0; display: inline-block; }

  .grid {
    display: grid; gap: 1px;
    background: rgba(0,240,255,0.04); padding: 1px;
    border: 1px solid var(--border);
    will-change: transform;
    /* Don't let the grid itself catch touch events — parent scroll-wrap handles them */
    touch-action: none;
  }

  /* ── Tile states ── */
  .tile {
    cursor: pointer; position: relative;
    transition: filter 0.1s;
    /* Each tile: allow browser to call click/pointer events but grid handles panning */
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }
  .tile:hover  { filter: brightness(1.4); }
  .tile.tapped { filter: brightness(2.5); transform: scale(0.88); transition: transform 0.05s; }
  .tile.empty  { background: #070d16; }
  .tile.mine::after { content: ''; position: absolute; inset: 0; border: 1px solid rgba(255,255,255,0.3); }

  .tile.stealable::after {
    content: ''; position: absolute; inset: 0;
    border: 1px solid var(--steal);
    animation: stealPulse 1.4s ease-in-out infinite;
  }
  @keyframes stealPulse {
    0%,100% { opacity: 0.5; box-shadow: inset 0 0 3px rgba(255,149,0,0.3); }
    50%      { opacity: 1;   box-shadow: inset 0 0 6px rgba(255,149,0,0.6); }
  }
  .tile.stealable:hover { filter: brightness(1.6) saturate(1.3); }

  .tile.flash       { animation: tileFlash  0.4s ease-out; }
  .tile.steal-flash { animation: stealFlash 0.5s ease-out; }
  @keyframes tileFlash  { 0%{filter:brightness(4) saturate(2)} 100%{filter:brightness(1)} }
  @keyframes stealFlash {
    0%   { filter: brightness(5) saturate(3) hue-rotate(20deg); }
    100% { filter: brightness(1); }
  }

  .progress-bar  { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; margin-top: 6px; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent), #007aff); transition: width 0.5s ease; }

  .event-log { max-height: 120px; overflow-y: auto; scrollbar-width: thin; }
  .event-log::-webkit-scrollbar { width: 2px; }
  .event-log::-webkit-scrollbar-thumb { background: var(--border); }
  .event-item { display: flex; align-items: center; gap: 5px; font-size: 9px; color: var(--muted); padding: 3px 0; border-bottom: 1px solid rgba(26,37,53,0.5); }
  .event-dot  { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

  .footer {
    grid-area: footer; height: 32px;
    background: var(--surface); border-top: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 16px; font-size: 9px; color: var(--muted); letter-spacing: 1px;
  }

  .toast-container {
    position: fixed; top: 64px; right: 12px; z-index: 3000;
    display: flex; flex-direction: column; gap: 6px; pointer-events: none;
    max-width: calc(100vw - 24px);
  }
  .toast {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 3px; padding: 9px 12px; font-size: 11px;
    animation: toastIn 0.3s ease, toastOut 0.3s ease 2.7s forwards;
    max-width: 260px; word-break: break-word;
  }
  .toast.success { border-color: #34c759; color: #34c759; }
  .toast.error   { border-color: var(--accent2); color: var(--accent2); }
  .toast.info    { border-color: var(--accent);  color: var(--accent); }
  .toast.steal   { border-color: var(--steal); color: var(--steal); }
  @keyframes toastIn  { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
  @keyframes toastOut { from{opacity:1} to{opacity:0} }

  .overlay {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(2,4,8,0.9); backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .modal {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 6px; padding: 24px; width: 100%; max-width: 380px;
    position: relative; max-height: 90vh; overflow-y: auto;
  }
  .modal::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
  }
  .modal-title { font-family: 'Orbitron', sans-serif; font-size: 20px; font-weight: 900; letter-spacing: 3px; margin-bottom: 4px; color: var(--accent); }
  .modal-sub   { font-size: 10px; color: var(--muted); letter-spacing: 1px; margin-bottom: 20px; }

  .gameover-overlay {
    position: fixed; inset: 0; z-index: 600;
    background: rgba(2,4,8,0.96); backdrop-filter: blur(16px);
    display: flex; align-items: center; justify-content: center;
    padding: 12px; animation: fadeIn 0.5s ease;
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .gameover-modal {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; width: 100%; max-width: 500px;
    overflow: hidden; position: relative;
    box-shadow: 0 0 60px rgba(0,240,255,0.08);
    max-height: 92dvh; display: flex; flex-direction: column;
  }
  .gameover-header {
    padding: 20px 24px 16px;
    background: linear-gradient(135deg, rgba(0,240,255,0.04), rgba(255,45,85,0.04));
    border-bottom: 1px solid var(--border); text-align: center; position: relative; flex-shrink: 0;
  }
  .gameover-header::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
  }
  .gameover-title { font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 6px; color: var(--muted); margin-bottom: 8px; }
  .gameover-label {
    font-family: 'Orbitron', sans-serif; font-size: 22px; font-weight: 900; letter-spacing: 3px;
    background: linear-gradient(135deg, var(--gold), #ff9500);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    animation: shimmer 2s infinite;
  }
  @keyframes shimmer { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.4)} }
  .winner-card {
    margin: 12px 0 0; display: flex; align-items: center; gap: 12px;
    background: rgba(255,215,0,0.06); border: 1px solid rgba(255,215,0,0.2);
    border-radius: 6px; padding: 12px 14px;
  }
  .winner-crown { font-size: 24px; }
  .winner-color { width: 10px; height: 36px; border-radius: 2px; flex-shrink: 0; }
  .winner-info  { flex: 1; min-width: 0; }
  .winner-name  { font-family: 'Orbitron', sans-serif; font-size: 14px; font-weight: 900; color: var(--gold); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .winner-tiles { font-size: 10px; color: var(--muted); margin-top: 2px; letter-spacing: 1px; }
  .winner-pct   { font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 900; color: var(--gold); flex-shrink: 0; }
  .my-result {
    margin: 10px 24px 0; padding: 9px 14px; border-radius: 4px; text-align: center;
    font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 2px; flex-shrink: 0;
  }
  .my-result.won  { background: rgba(255,215,0,0.1);  border: 1px solid var(--gold);   color: var(--gold); }
  .my-result.lost { background: rgba(0,240,255,0.04); border: 1px solid var(--border); color: var(--accent); }
  .rankings-list {
    padding: 12px 24px; overflow-y: auto; flex: 1;
    scrollbar-width: thin; scrollbar-color: var(--border) transparent;
  }
  .rankings-list::-webkit-scrollbar { width: 3px; }
  .rankings-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  .rank-row {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 8px; border-radius: 3px; margin-bottom: 4px;
    position: relative; overflow: hidden; border: 1px solid transparent;
  }
  .rank-row.me-row { border-color: var(--accent); background: rgba(0,240,255,0.03); }
  .rank-row.rank-1 { background: rgba(255,215,0,0.06);   border-color: rgba(255,215,0,0.3); }
  .rank-row.rank-2 { background: rgba(192,192,192,0.04); border-color: rgba(192,192,192,0.2); }
  .rank-row.rank-3 { background: rgba(205,127,50,0.04);  border-color: rgba(205,127,50,0.2); }
  .rank-fill  { position: absolute; left: 0; top: 0; height: 100%; opacity: 0.06; }
  .rank-medal { font-size: 13px; min-width: 20px; text-align: center; }
  .rank-num   { font-family: 'Orbitron', sans-serif; font-size: 9px; color: var(--muted); min-width: 20px; }
  .rank-dot   { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .rank-name  { flex: 1; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rank-count { font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 700; flex-shrink: 0; }
  .rank-pct   { font-size: 9px; color: var(--muted); min-width: 38px; text-align: right; }
  .reset-bar {
    padding: 12px 24px 16px; border-top: 1px solid var(--border);
    display: flex; align-items: center; gap: 12px; flex-shrink: 0;
  }
  .reset-label    { font-size: 10px; color: var(--muted); letter-spacing: 1px; white-space: nowrap; }
  .reset-progress { flex: 1; height: 5px; background: var(--border); border-radius: 3px; overflow: hidden; }
  .reset-fill     { height: 100%; background: linear-gradient(90deg, var(--accent2), var(--accent)); transition: width 1s linear; }
  .reset-num      { font-family: 'Orbitron', sans-serif; font-size: 16px; font-weight: 900; color: var(--accent); min-width: 24px; text-align: right; }

  /* ───────────────────── MOBILE ───────────────────── */
  @media (max-width: 767px) {
    body { overflow: hidden; }
    .app {
      display: flex; flex-direction: column;
      height: 100dvh; /* Use dvh so address bar doesn't overlap */
    }
    .header { height: var(--header-h); padding: 0 12px; flex-shrink: 0; }
    .logo   { font-size: 15px; letter-spacing: 2px; }
    .cooldown-badge-text { display: none; }
    .sidebar-left, .sidebar-right, .footer { display: none; }

    /* Grid area fills all remaining space between cooldown strip and tabs */
    .grid-area {
      flex: 1; min-height: 0;
      align-items: flex-start;
      justify-content: flex-start;
      overflow: hidden; /* Scroll wrapper handles it */
    }

    /* Scroll wrapper takes full width/height of grid-area */
    .grid-scroll-wrap {
      width: 100%; height: 100%;
      overflow: auto;
      touch-action: pan-x pan-y; /* ← KEY: allow panning over tiles */
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }

    .grid-inner { padding: 8px; }

    /* Grid tiles: touch-action none so pointer events work,
       but the SCROLL WRAPPER above handles panning */
    .grid { touch-action: none; }
    .tile { touch-action: none; }

    /* ── Cooldown strip ── */
    .mobile-cooldown-strip {
      display: flex; align-items: center;
      padding: 5px 12px; background: var(--surface);
      border-bottom: 1px solid var(--border); flex-shrink: 0; gap: 10px;
    }
    .mcs-label { font-size: 9px; color: var(--muted); letter-spacing: 1px; white-space: nowrap; }
    .mcs-val   { font-family: 'Orbitron', sans-serif; font-size: 12px; font-weight: 900; white-space: nowrap; }
    .mcs-bar   { flex: 1; height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; }
    .mcs-fill  { height: 100%; border-radius: 2px; transition: width 0.1s linear; }

    .mcs-steal-pill {
      display: flex; align-items: center; gap: 4px;
      background: rgba(255,149,0,0.12); border: 1px solid rgba(255,149,0,0.3);
      border-radius: 10px; padding: 2px 7px; white-space: nowrap;
    }
    .mcs-steal-pill.locked { opacity: 0.4; }
    .mcs-steal-icon { font-size: 10px; }
    .mcs-steal-text { font-family: 'Orbitron', sans-serif; font-size: 9px; font-weight: 700; color: var(--steal); }

    /* ── Bottom tabs ── */
    .mobile-tabs {
      display: flex; flex-shrink: 0; height: var(--tab-h);
      background: var(--surface); border-top: 1px solid var(--border);
      position: relative; z-index: 20;
    }
    .mobile-tab {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 3px; cursor: pointer; border: none; background: transparent;
      color: var(--muted); font-family: 'Orbitron', sans-serif; font-size: 7px; letter-spacing: 1px;
      transition: color 0.2s; padding: 0; -webkit-tap-highlight-color: transparent; position: relative;
    }
    .mobile-tab.active { color: var(--accent); }
    .mobile-tab.active::before {
      content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
      width: 28px; height: 2px; background: var(--accent); border-radius: 0 0 2px 2px;
    }
    .mobile-tab svg { width: 19px; height: 19px; }

    .mobile-panel {
      position: fixed;
      inset: calc(var(--header-h) + 34px) 0 var(--tab-h) 0;
      background: var(--surface); z-index: 15;
      overflow-y: auto; padding: 16px;
      animation: panelIn 0.2s ease;
    }
    @keyframes panelIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

    .rank-badge {
      position: absolute; top: 5px; right: calc(50% - 20px);
      width: 15px; height: 15px; border-radius: 50%;
      background: var(--accent); color: var(--bg);
      font-size: 7px; font-family: 'Orbitron', sans-serif; font-weight: 900;
      display: flex; align-items: center; justify-content: center;
    }

    .lb-entry { padding: 10px 10px; }
    .toast-container { top: calc(var(--header-h) + 42px); right: 10px; left: 10px; }
    .toast { max-width: 100%; }
    .gameover-overlay { padding: 0; align-items: flex-end; }
    .gameover-modal   { max-height: 88dvh; border-radius: 12px 12px 0 0; max-width: 100%; }
    .gameover-header  { padding: 16px 18px 12px; }
    .gameover-label   { font-size: 18px; }
    .my-result        { margin: 8px 16px 0; font-size: 10px; }
    .rankings-list    { padding: 10px 16px; }
    .reset-bar        { padding: 10px 16px 20px; }
  }

  @media (min-width: 768px) {
    .mobile-tabs, .mobile-panel, .mobile-cooldown-strip { display: none; }
  }

  @keyframes gridLoad { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
  .grid-container { animation: gridLoad 0.4s ease; }
`;

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);
  return { toasts, add };
}

function CooldownRing({ remaining, total, size = 30 }) {
  const r = (size / 2) - 3;
  const circ = 2 * Math.PI * r;
  const ready = remaining <= 0;
  const offset = circ * (1 - (remaining / total));
  return (
    <div className="cooldown-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="track" cx={size/2} cy={size/2} r={r} />
        <circle className={`progress ${ready?"ready":""}`} cx={size/2} cy={size/2} r={r}
          strokeDasharray={circ} strokeDashoffset={ready ? 0 : offset} />
      </svg>
      <div className={`cooldown-ring-label ${ready?"ready":""}`}>
        {ready ? "GO" : Math.ceil(remaining)}
      </div>
    </div>
  );
}

function StealStatusCard({ claimedCount, stolenCount }) {
  const allowance       = stealAllowance(claimedCount);
  const slotsUsed       = stolenCount;
  const slotsLeft       = Math.max(0, allowance - slotsUsed);
  const nextUnlock      = (Math.floor(claimedCount / STEAL_THRESHOLD) + 1) * STEAL_THRESHOLD;
  const bracketProgress = allowance === 0
    ? (claimedCount / STEAL_THRESHOLD) * 100
    : ((claimedCount % STEAL_THRESHOLD) / STEAL_THRESHOLD) * 100;
  const displaySlots = Math.max(allowance + 1, 1);

  return (
    <div className={`steal-card ${slotsLeft > 0 ? "has-steals" : ""}`}>
      <div className="steal-card-title">⚔ STEAL POWER</div>
      <div className="steal-slots">
        {Array.from({ length: Math.min(displaySlots, 6) }, (_, i) => {
          if (i < slotsUsed) return <div key={i} className="steal-slot filled" title="Steal used">✓</div>;
          if (i < allowance) return <div key={i} className="steal-slot empty-slot" title="Steal available">⚔</div>;
          return <div key={i} className="steal-slot locked" title="Locked">🔒</div>;
        })}
        {displaySlots > 6 && (
          <div style={{fontSize:9,color:"var(--steal)",alignSelf:"center",letterSpacing:1}}>
            +{displaySlots - 6}
          </div>
        )}
      </div>
      <div style={{fontSize:9,color:"var(--muted)",letterSpacing:1,marginBottom:6}}>
        {slotsLeft > 0
          ? <span style={{color:"var(--steal)"}}>
              {slotsLeft} STEAL{slotsLeft !== 1 ? "S" : ""} AVAILABLE — TAP AN ENEMY TILE
            </span>
          : allowance === 0
          ? <span>CLAIM {STEAL_THRESHOLD} TILES TO UNLOCK</span>
          : <span>ALL SLOTS USED — CLAIM {nextUnlock - claimedCount} MORE TO UNLOCK NEXT</span>
        }
      </div>
      <div className="steal-progress-row">
        <div className="steal-progress-label">{claimedCount % STEAL_THRESHOLD}/{STEAL_THRESHOLD}</div>
        <div className="steal-progress-bar">
          <div className="steal-progress-fill" style={{ width: `${bracketProgress}%` }} />
        </div>
        <div className="steal-progress-label">+1 SLOT</div>
      </div>
    </div>
  );
}

function GameOverOverlay({ gameOver, me, resetIn }) {
  const [countdown, setCountdown] = useState(resetIn);

  useEffect(() => {
    setCountdown(resetIn);
    if (resetIn <= 0) return;
    const iv = setInterval(() => setCountdown(c => {
      if (c <= 1) { clearInterval(iv); return 0; }
      return c - 1;
    }), 1000);
    return () => clearInterval(iv);
  }, [resetIn, gameOver]);

  if (!gameOver) return null;
  const { winner, rankings } = gameOver;
  const myRankIndex = me ? rankings.findIndex(r => r.userId === me.id) : -1;
  const isWinner    = me && winner.userId === me.id;
  const medals      = ["🥇","🥈","🥉"];

  return (
    <div className="gameover-overlay">
      <div className="gameover-modal">
        <div className="gameover-header">
          <div className="gameover-title">— GAME OVER —</div>
          <div className="gameover-label">TERRITORY CONQUERED</div>
          <div className="winner-card">
            <div className="winner-crown">👑</div>
            <div className="winner-color" style={{ background: winner.color }} />
            <div className="winner-info">
              <div className="winner-name">{winner.name}</div>
              <div className="winner-tiles">{winner.count} TILES</div>
            </div>
            <div className="winner-pct">{((winner.count/TOTAL_TILES)*100).toFixed(1)}%</div>
          </div>
        </div>
        {me && myRankIndex >= 0 && (
          <div className={`my-result ${isWinner?"won":"lost"}`}>
            {isWinner ? "⚡ YOU WIN! TERRITORY DOMINATED ⚡"
              : `YOUR RANK: #${myRankIndex+1} — ${rankings[myRankIndex]?.count||0} TILES`}
          </div>
        )}
        <div className="rankings-list">
          {rankings.map((entry, i) => (
            <div key={entry.userId} className={["rank-row",`rank-${i+1}`,entry.userId===me?.id?"me-row":""].join(" ")}>
              <div className="rank-fill" style={{width:`${(entry.count/(rankings[0]?.count||1))*100}%`,background:entry.color}} />
              {medals[i] ? <div className="rank-medal">{medals[i]}</div> : <div className="rank-num">#{i+1}</div>}
              <div className="rank-dot" style={{background:entry.color}} />
              <div className="rank-name" style={{
                color: i===0?"var(--gold)":i===1?"var(--silver)":i===2?"var(--bronze)":"var(--text)",
                fontWeight: entry.userId===me?.id?"bold":"normal"
              }}>
                {entry.name}{entry.userId===me?.id?" (YOU)":""}
              </div>
              <div className="rank-count" style={{color:i===0?"var(--gold)":i===1?"var(--silver)":i===2?"var(--bronze)":"var(--accent)"}}>
                {entry.count}
              </div>
              <div className="rank-pct">{((entry.count/TOTAL_TILES)*100).toFixed(1)}%</div>
            </div>
          ))}
        </div>
        <div className="reset-bar">
          <div className="reset-label">NEW GAME IN</div>
          <div className="reset-progress">
            <div className="reset-fill" style={{width:`${resetIn > 0 ? (countdown/resetIn)*100 : 0}%`}} />
          </div>
          <div className="reset-num">{countdown}s</div>
        </div>
      </div>
    </div>
  );
}

const GridIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
const StatsIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg>;
const RankIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
const FeedIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;

export default function GridWars() {
  const [tileOwners, setTileOwners]       = useState(() => new Map());
  const [leaderboard, setLeaderboard]     = useState([]);
  const [me, setMe]                       = useState(null);
  const [wsStatus, setWsStatus]           = useState("disconnected");
  const [flashTiles, setFlashTiles]       = useState(new Set());
  const [stealFlashTiles, setStealFlashTiles] = useState(new Set());
  const [events, setEvents]               = useState([]);
  const [showRegister, setShowRegister]   = useState(true);
  const [tileSize, setTileSize]           = useState(14);
  const [gameOver, setGameOver]           = useState(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [activeTab, setActiveTab]         = useState(null);
  const [isMobile, setIsMobile]           = useState(false);
  const [claimedCount, setClaimedCount]   = useState(0);
  const [stolenCount, setStolenCount]     = useState(0);

  const cooldownRef = useRef(null);
  const wsRef       = useRef(null);
  const toastRef    = useRef(null);
  // Touch-tracking ref: records {x, y} of touchstart to detect scroll vs tap
  const touchStartRef = useRef(null);

  const { toasts, add: toast } = useToast();
  toastRef.current = toast;

  const [formName,  setFormName]  = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const startCooldown = useCallback(() => {
    setCooldownRemaining(CAPTURE_COOLDOWN);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldownRemaining(c => {
        if (c <= 0.1) { clearInterval(cooldownRef.current); return 0; }
        return c - 0.1;
      });
    }, 100);
  }, []);

  const loadTiles = useCallback(async () => {
    try {
      const r   = await fetch(`${API_BASE}/tiles`);
      const arr = (await r.json()) || [];
      setTileOwners(new Map(arr.map(t => [t.id, t.ownerId ?? null])));
    } catch { toastRef.current("Failed to load tiles", "error"); }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/leaderboard`);
      setLeaderboard((await r.json()) || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadTiles();
    loadLeaderboard();
    const iv = setInterval(loadLeaderboard, 8000);
    return () => clearInterval(iv);
  }, []);

  const userColorMap = useMemo(() => {
    const map = new Map(leaderboard.map(e => [e.userId, e.color]));
    if (me) map.set(me.id, me.color);
    return map;
  }, [leaderboard, me]);

  const stealAllowanceCount = stealAllowance(claimedCount);
  const stealsLeft          = Math.max(0, stealAllowanceCount - stolenCount);
  const canSteal            = stealsLeft > 0;

  useEffect(() => {
    let reconnectTimer = null;
    function connect() {
      const sock = new WebSocket(API_BASE.replace(/^http/, "ws") + "/ws");
      wsRef.current = sock;
      sock.onopen = () => {
        setWsStatus("connected");
        toastRef.current("Live connection established", "success");
        loadTiles(); loadLeaderboard();
      };
      sock.onclose = () => {
        setWsStatus("disconnected");
        reconnectTimer = setTimeout(connect, 3000);
      };
      sock.onerror = () => setWsStatus("disconnected");
      sock.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "tile_update") {
            const wasSteal = msg.stolen === true;
            setTileOwners(prev => { const next = new Map(prev); next.set(msg.id, msg.ownerId ?? null); return next; });
            if (wasSteal) {
              setStealFlashTiles(f => new Set([...f, msg.id]));
              setTimeout(() => setStealFlashTiles(f => { const n = new Set(f); n.delete(msg.id); return n; }), 600);
            } else {
              setFlashTiles(f => new Set([...f, msg.id]));
              setTimeout(() => setFlashTiles(f => { const n = new Set(f); n.delete(msg.id); return n; }), 500);
            }
            setEvents(prev => [{
              id: Date.now() + Math.random(),
              tileId: msg.id, ownerId: msg.ownerId,
              previousOwner: msg.previousOwner ?? null,
              stolen: wasSteal,
              time: new Date().toLocaleTimeString("en", { hour12: false }),
            }, ...prev.slice(0, 49)]);
          }
          if (msg.type === "game_over") {
            if (msg.rankings?.length) {
              setLeaderboard(msg.rankings.map(r => ({ userId: r.userId, name: r.name, color: r.color, count: r.count })));
            }
            setGameOver({ winner: msg.winner, rankings: msg.rankings, resetIn: msg.resetIn });
            toastRef.current("GAME OVER! All tiles captured!", "info");
          }
          if (msg.type === "new_game") {
            setGameOver(null);
            setTileOwners(prev => { const next = new Map(); for (const [id] of prev) next.set(id, null); return next; });
            setEvents([]);
            setCooldownRemaining(0);
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            setClaimedCount(0); setStolenCount(0);
            setMe(null); setShowRegister(true);
            setFormName(""); setFormColor(PRESET_COLORS[0]);
            toastRef.current(" NEW GAME STARTED!", "success");
            loadTiles(); loadLeaderboard();
          }
        } catch {}
      };
    }
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const handleRegister = async () => {
    if (!formName.trim()) return toast("Name required", "error");
    const userId = genId();
    try {
      const r = await fetch(`${API_BASE}/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, name: formName.trim(), color: formColor }),
      });
      if (!r.ok) throw new Error("Registration failed");
      setMe({ id: userId, name: formName.trim(), color: formColor });
      setShowRegister(false);
      toast(`Welcome, ${formName.trim()}!`, "success");
      loadLeaderboard();
    } catch (err) { toast(err.message, "error"); }
  };

  const handleCapture = useCallback(async (tileId) => {
    if (!me)                { toast("Register first!", "error"); return; }
    if (cooldownRemaining > 0) { toast(`Wait ${Math.ceil(cooldownRemaining)}s`, "error"); return; }
    if (gameOver)           { toast("Wait for new game!", "error"); return; }
    if (isMobile && activeTab !== null) setActiveTab(null);

    const currentOwner = tileOwners.get(tileId) ?? null;
    const isEnemyTile  = currentOwner !== null && currentOwner !== me.id;

    if (isEnemyTile && !canSteal) {
      if (stealAllowanceCount === 0) {
        toast(`Need ${STEAL_THRESHOLD} claimed tiles to steal — you have ${claimedCount}`, "error");
      } else {
        const nextUnlock = (Math.floor(claimedCount / STEAL_THRESHOLD) + 1) * STEAL_THRESHOLD;
        toast(`All steal slots used — claim ${nextUnlock - claimedCount} more tiles to unlock next slot`, "error");
      }
      return;
    }

    try {
      const r = await fetch(`${API_BASE}/capture`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tileId, userId: me.id }),
      });

      if (r.status === 429) {
        const data = await r.json();
        const rem  = data.remaining || CAPTURE_COOLDOWN;
        setCooldownRemaining(rem);
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
          setCooldownRemaining(c => { if (c <= 0.1) { clearInterval(cooldownRef.current); return 0; } return c - 0.1; });
        }, 100);
        toast(`Cooldown! ${rem.toFixed(1)}s`, "error");
        return;
      }

      if (!r.ok) {
        const errText = await r.text() || "Capture failed";
        toast(errText, "error");
        return;
      }

      const tile = await r.json();
      setTileOwners(prev => { const next = new Map(prev); next.set(tile.id, tile.ownerId); return next; });
      startCooldown();

      if (isEnemyTile) {
        setStolenCount(c => c + 1);
        toast(`⚔ Tile #${tile.id} stolen! ${stealsLeft - 1} steal${stealsLeft - 1 !== 1 ? "s" : ""} remaining`, "steal");
      } else {
        const newClaimed = claimedCount + 1;
        setClaimedCount(newClaimed);
        if (newClaimed % STEAL_THRESHOLD === 0) {
          toast(`⚔ STEAL UNLOCKED! You can now steal ${stealAllowance(newClaimed) - stolenCount} tile${stealAllowance(newClaimed) - stolenCount !== 1 ? "s" : ""}`, "steal");
        } else {
          toast(`Tile #${tile.id} captured! ✓`, "success");
        }
      }
    } catch { toast("Capture failed", "error"); }
  }, [me, cooldownRemaining, gameOver, isMobile, activeTab, tileOwners, canSteal,
      stealAllowanceCount, claimedCount, stolenCount, stealsLeft, startCooldown]);

  // ── Tile size: fixed 16px on mobile (scrollable), calculated on desktop ──
  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 768) {
        setTileSize(MOBILE_TILE_SIZE);
      } else {
        const vw = window.innerWidth - 260 - 240 - 20;
        const vh = window.innerHeight - 52 - 32 - 20;
        setTileSize(Math.max(8, Math.min(Math.floor(Math.min(vw/GRID_COLS, vh/GRID_ROWS)), 24)));
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [isMobile]);

  const { myTileCount, capturedCount } = useMemo(() => {
    let myTileCount = 0, capturedCount = 0;
    for (const [, ownerId] of tileOwners) {
      if (ownerId != null) {
        capturedCount++;
        if (me && ownerId === me.id) myTileCount++;
      }
    }
    return { myTileCount, capturedCount };
  }, [tileOwners, me]);

  const progress  = (capturedCount / TOTAL_TILES) * 100;
  const maxCount  = leaderboard[0]?.count || 1;
  const isReady   = cooldownRemaining <= 0;
  const myRankNum = me ? leaderboard.findIndex(l => l.userId === me.id) + 1 : 0;

  // ── Touch handlers: distinguish tap from scroll ──
  // touchstart on the scroll wrapper records position
  // touchend on a tile checks distance — if < TAP_THRESHOLD, fire capture
  const handleTilePointerDown = useCallback((e) => {
    // Record position from mouse or first touch
    const point = e.touches ? e.touches[0] : e;
    touchStartRef.current = { x: point.clientX, y: point.clientY };
  }, []);

  const handleTilePointerUp = useCallback((e, tileId) => {
    if (!touchStartRef.current) return;
    const point = e.changedTouches ? e.changedTouches[0] : e;
    const dx = Math.abs(point.clientX - touchStartRef.current.x);
    const dy = Math.abs(point.clientY - touchStartRef.current.y);
    touchStartRef.current = null;
    // Only fire if finger barely moved (tap, not scroll)
    if (dx < TAP_THRESHOLD && dy < TAP_THRESHOLD) {
      handleCapture(tileId);
    }
  }, [handleCapture]);

  const StatsContent = () => (
    <>
      <div className="section-title">COMMANDER</div>
      {me ? (
        <>
          <div className="player-card" style={{"--player-color": me.color}}>
            <div className="player-name">{me.name}</div>
            <div style={{fontSize:9,color:"var(--muted)",letterSpacing:1,marginBottom:2}}>{me.id.slice(0,10)}...</div>
            <div className="player-stats">
              <div className="stat">
                <div className="stat-value" style={{color:me.color}}>{myTileCount}</div>
                <div className="stat-label">TILES</div>
              </div>
              <div className="stat">
                <div className="stat-value">{((myTileCount/TOTAL_TILES)*100).toFixed(1)}%</div>
                <div className="stat-label">CONTROL</div>
              </div>
            </div>
            <div className="progress-bar" style={{marginTop:8}}>
              <div className="progress-fill" style={{width:`${(myTileCount/TOTAL_TILES)*100}%`,background:`linear-gradient(90deg,${me.color},${darken(me.color,-30)})`}} />
            </div>
          </div>
          <StealStatusCard claimedCount={claimedCount} stolenCount={stolenCount} />
          <button className="btn danger" style={{marginBottom:16}} onClick={()=>{setMe(null);setShowRegister(true);}}>
            ABANDON POST
          </button>
        </>
      ) : (
        <div style={{color:"var(--muted)",fontSize:11,textAlign:"center",padding:"16px 0 20px"}}>Not registered</div>
      )}
      <div className="section-title">WORLD STATUS</div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--muted)",marginBottom:4}}>
        <span>CONQUEST</span><span>{progress.toFixed(1)}%</span>
      </div>
      <div className="progress-bar"><div className="progress-fill" style={{width:`${progress}%`}} /></div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--muted)",letterSpacing:1,marginTop:5}}>
        <span>{capturedCount} CLAIMED</span><span>{TOTAL_TILES-capturedCount} FREE</span>
      </div>
      <div style={{marginTop:14,padding:10,background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:3}}>
        <div style={{fontSize:8,letterSpacing:2,color:"var(--muted)",marginBottom:6}}>HOW TO PLAY</div>
        <div style={{fontSize:10,color:"var(--muted)",lineHeight:1.9}}>
          <div>→ Tap any free tile to capture it</div>
          <div>→ <span style={{color:"var(--accent2)"}}>3s cooldown</span> between captures</div>
          <div>→ Claim 5 tiles → unlock <span style={{color:"var(--steal)"}}>⚔ 1 steal</span></div>
          <div>→ Every +5 tiles = another steal slot</div>
          <div>→ <span style={{color:"var(--steal)"}}>Pulsing tiles</span> = stealable</div>
          <div>→ Fill all 1000 tiles to end the round</div>
          <div>→ Most tiles = <span style={{color:"var(--gold)"}}>WIN</span></div>
          {isMobile && <div>→ <span style={{color:"var(--accent)"}}>Scroll to pan</span> the grid</div>}
        </div>
      </div>
    </>
  );

  const LeaderboardContent = () => (
    <>
      <div className="section-title">LEADERBOARD</div>
      <div className="leaderboard">
        {leaderboard.length === 0
          ? <div style={{fontSize:11,color:"var(--muted)",textAlign:"center",padding:"20px 0"}}>No commanders yet</div>
          : leaderboard.map((entry, i) => (
            <div key={entry.userId} className={`lb-entry ${entry.userId===me?.id?"me":""}`}>
              <div className="lb-bar" style={{width:`${(entry.count/maxCount)*100}%`,background:entry.color}} />
              <div className="lb-rank">#{i+1}</div>
              <div className="lb-dot" style={{background:entry.color}} />
              <div className="lb-name" style={{color:entry.userId===me?.id?"var(--accent)":"var(--text)"}}>
                {entry.name}{entry.userId===me?.id?" ◀":""}
              </div>
              <div className="lb-count">{entry.count}</div>
            </div>
          ))}
      </div>
    </>
  );

  const FeedContent = () => (
    <>
      <div className="section-title">LIVE FEED</div>
      {events.length === 0
        ? <div style={{fontSize:11,color:"var(--muted)",textAlign:"center",padding:"24px 0"}}>Awaiting activity...</div>
        : events.map(ev => {
          const color  = userColorMap.get(ev.ownerId) || "var(--accent)";
          const lb     = leaderboard.find(l => l.userId === ev.ownerId);
          const prevLb = ev.previousOwner ? leaderboard.find(l => l.userId === ev.previousOwner) : null;
          return (
            <div key={ev.id} style={{
              display:"flex", alignItems:"center", gap:6, fontSize:11,
              color: ev.stolen ? "var(--steal)" : "var(--muted)",
              padding:"7px 0", borderBottom:"1px solid rgba(26,37,53,0.5)"
            }}>
              <div style={{width:6,height:6,borderRadius:"50%",background:color,flexShrink:0}} />
              <span style={{flex:1}}>
                {ev.stolen && <span style={{color:"var(--steal)",fontWeight:"bold"}}>⚔ </span>}
                <span style={{color}}>{lb?.name||ev.ownerId?.slice(0,6)||"?"}</span>
                {ev.stolen
                  ? <> stole <span style={{color:"var(--text)"}}>#{ev.tileId}</span>
                      {prevLb && <> from <span style={{color:userColorMap.get(ev.previousOwner)||"var(--muted)"}}>{prevLb.name}</span></>}
                    </>
                  : <> captured <span style={{color:"var(--text)"}}>#{ev.tileId}</span></>
                }
              </span>
              <span style={{flexShrink:0,fontSize:9}}>{ev.time}</span>
            </div>
          );
        })}
    </>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="scanline" />
      <div className="toast-container">
        {toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>)}
      </div>
      {gameOver && <GameOverOverlay gameOver={gameOver} me={me} resetIn={gameOver.resetIn} />}
      {showRegister && !gameOver && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-title">GRID WARS</div>
            <div className="modal-sub">CLAIM TERRITORY // 1000 TILES</div>
            <div className="field">
              <label>COMMANDER NAME</label>
              <input value={formName} onChange={e=>setFormName(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleRegister()}
                placeholder="Enter callsign..." autoFocus />
            </div>
            <div className="field">
              <label>TERRITORY COLOR</label>
              <div className="color-picker">
                {PRESET_COLORS.map(c => (
                  <div key={c} className={`color-swatch ${formColor===c?"selected":""}`}
                    style={{background:c}} onClick={()=>setFormColor(c)} />
                ))}
              </div>
            </div>
            <button className="btn" onClick={handleRegister}>ENTER THE WAR</button>
          </div>
        </div>
      )}

      <div className="app">
        <header className="header">
          <div className="logo">GRID<span>WAR</span>S</div>
          <div className="header-center">
            {me && (
              <div className={`cooldown-badge ${isReady?"ready":"waiting"}`}>
                <CooldownRing remaining={cooldownRemaining} total={CAPTURE_COOLDOWN} size={isMobile?26:30} />
                <div className="cooldown-badge-text">
                  <div style={{fontSize:8,letterSpacing:2,marginBottom:1}}>NEXT CAPTURE</div>
                  <div className="cooldown-num">{isReady?"READY":`${cooldownRemaining.toFixed(1)}s`}</div>
                </div>
              </div>
            )}
            {!isMobile && (
              <span style={{fontSize:10,color:"var(--muted)",letterSpacing:1}}>
                {capturedCount}/{TOTAL_TILES} TILES
              </span>
            )}
            {!isMobile && me && (
              <div style={{
                display:"flex", alignItems:"center", gap:6,
                background: canSteal ? "rgba(255,149,0,0.1)" : "var(--surface2)",
                border: `1px solid ${canSteal ? "rgba(255,149,0,0.4)" : "var(--border)"}`,
                borderRadius:3, padding:"4px 10px", fontSize:10, letterSpacing:1,
                color: canSteal ? "var(--steal)" : "var(--muted)", transition:"all 0.3s",
              }}>
                <span>⚔</span>
                <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:12,fontWeight:900}}>{stealsLeft}</span>
                <span style={{fontSize:8}}>STEAL{stealsLeft !== 1 ? "S" : ""}</span>
              </div>
            )}
          </div>
          <div className="header-right">
            <div className="ws-indicator">
              <div className={`ws-dot ${wsStatus}`} />
              {!isMobile && <span>{wsStatus.toUpperCase()}</span>}
            </div>
          </div>
        </header>

        {/* ── Mobile cooldown + steal strip ── */}
        {isMobile && (
          <div className="mobile-cooldown-strip">
            <span className="mcs-label">TILES</span>
            <span className="mcs-val" style={{color:"var(--accent)"}}>
              {capturedCount}<span style={{fontSize:9,color:"var(--muted)"}}>/{TOTAL_TILES}</span>
            </span>
            <div className="mcs-bar">
              <div className="mcs-fill" style={{
                width: isReady?"100%":`${(1-cooldownRemaining/CAPTURE_COOLDOWN)*100}%`,
                background: isReady?"#34c759":"var(--accent2)",
              }} />
            </div>
            <span className="mcs-val" style={{color:isReady?"#34c759":"var(--accent2)"}}>
              {isReady?"READY":`${cooldownRemaining.toFixed(1)}s`}
            </span>
            {me && (
              <div className={`mcs-steal-pill ${!canSteal ? "locked" : ""}`}>
                <span className="mcs-steal-icon">⚔</span>
                <span className="mcs-steal-text">{stealsLeft}</span>
              </div>
            )}
          </div>
        )}

        <aside className="sidebar sidebar-left"><StatsContent /></aside>

        <main className="grid-area">
          {/*
            ── Scroll wrapper: touch-action pan-x pan-y so the browser
               handles panning natively. Tiles use touch-action:none so
               pointer events bubble up, but the wrapper catches drags. ──
          */}
          <div className="grid-scroll-wrap">
            <div className="grid-inner">
              <div className="grid-container">
                <div
                  className="grid"
                  style={{ gridTemplateColumns: `repeat(${GRID_COLS},${tileSize}px)` }}
                >
                  {Array.from({ length: TOTAL_TILES }, (_, i) => {
                    const tileId      = i + 1;
                    const ownerId     = tileOwners.get(tileId) ?? null;
                    const color       = ownerId ? userColorMap.get(ownerId) : null;
                    const isMine      = !!(me && ownerId && ownerId === me.id);
                    const isEnemy     = !!(ownerId && !isMine);
                    const isStealable = isEnemy && canSteal;
                    const isFlash      = flashTiles.has(tileId);
                    const isStealFlash = stealFlashTiles.has(tileId);
                    return (
                      <div
                        key={tileId}
                        className={[
                          "tile",
                          ownerId ? "captured" : "empty",
                          isMine       ? "mine"        : "",
                          isStealable  ? "stealable"   : "",
                          isStealFlash ? "steal-flash" : isFlash ? "flash" : "",
                        ].join(" ")}
                        style={{
                          width: tileSize, height: tileSize,
                          background: color || (ownerId ? "#333" : undefined),
                          boxShadow: isMine && me?.color ? `0 0 4px ${me.color}88` : undefined,
                          opacity: gameOver && !ownerId ? 0.5 : 1,
                          filter: isStealable ? "saturate(0.7) brightness(0.85)" : undefined,
                        }}
                        // Desktop: plain click works fine
                        onClick={!isMobile ? () => handleCapture(tileId) : undefined}
                        // Mobile: use touch events with drag-distance guard
                        onTouchStart={isMobile ? handleTilePointerDown : undefined}
                        onTouchEnd={isMobile ? (e) => handleTilePointerUp(e, tileId) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside className="sidebar sidebar-right">
          <LeaderboardContent />
          <div className="section-title" style={{marginTop:14}}>LIVE FEED</div>
          <div className="event-log">
            {events.length === 0
              ? <div style={{fontSize:9,color:"var(--muted)",textAlign:"center",padding:"10px 0"}}>Awaiting activity...</div>
              : events.map(ev => {
                const color = userColorMap.get(ev.ownerId) || "var(--accent)";
                const lb    = leaderboard.find(l => l.userId === ev.ownerId);
                return (
                  <div key={ev.id} className="event-item">
                    <div className="event-dot" style={{background: ev.stolen ? "var(--steal)" : color}} />
                    <span style={{flex:1, color: ev.stolen ? "var(--steal)" : "inherit"}}>
                      {ev.stolen && "⚔ "}
                      <span style={{color}}>{lb?.name||ev.ownerId?.slice(0,6)||"?"}</span>
                      {ev.stolen ? " stole" : " took"} #{ev.tileId}
                    </span>
                    <span>{ev.time}</span>
                  </div>
                );
              })}
          </div>
        </aside>

        <footer className="footer">
          <span>GRID WARS // REAL-TIME TERRITORY CONTROL</span>
          <span>{TOTAL_TILES} TILES // {GRID_COLS}×{GRID_ROWS}</span>
          <span>WS: {wsStatus.toUpperCase()}</span>
        </footer>

        {isMobile && activeTab && (
          <div className="mobile-panel">
            {activeTab === "stats" && <StatsContent />}
            {activeTab === "ranks" && <LeaderboardContent />}
            {activeTab === "feed"  && <FeedContent />}
          </div>
        )}

        {isMobile && (
          <nav className="mobile-tabs">
            {[
              { id:"stats", label:"STATS", Icon:StatsIcon },
              { id:null,    label:"GRID",  Icon:GridIcon  },
              { id:"ranks", label:"RANKS", Icon:RankIcon  },
              { id:"feed",  label:"FEED",  Icon:FeedIcon  },
            ].map(tab => (
              <button
                key={String(tab.id)}
                className={`mobile-tab ${activeTab===tab.id?"active":""}`}
                onClick={() => setActiveTab(activeTab===tab.id&&tab.id!==null?null:tab.id)}
              >
                <tab.Icon />
                <span>{tab.label}</span>
                {tab.id==="ranks" && myRankNum>0 && <div className="rank-badge">{myRankNum}</div>}
              </button>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}