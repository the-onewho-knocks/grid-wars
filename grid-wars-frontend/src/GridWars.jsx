import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = "https://grid-wars-production.up.railway.app";
// For local dev: const API_BASE = "http://localhost:8080";

const GRID_COLS = 40;
const GRID_ROWS = 25;
const TOTAL_TILES = 1000;
const CAPTURE_COOLDOWN = 3; // seconds — must match backend

const PRESET_COLORS = [
  "#FF2D55", "#FF9500", "#FFCC00", "#34C759", "#00C7BE",
  "#007AFF", "#5856D6", "#AF52DE", "#FF375F", "#30D158",
];

function darken(hex, amount = 40) {
  let r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  let g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  let b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    --text: #e8f4f8;
    --muted: #4a6380;
    --grid-line: rgba(0, 240, 255, 0.06);
  }

  html, body, #root { height: 100%; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Share Tech Mono', monospace;
    overflow: hidden;
  }

  .scanline {
    position: fixed; inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px);
    pointer-events: none; z-index: 1000;
  }

  /* ─── Layout ─── */
  .app {
    display: grid;
    grid-template-rows: 56px 1fr 32px;
    grid-template-columns: 280px 1fr 260px;
    grid-template-areas:
      "header header header"
      "sidebar-left grid sidebar-right"
      "footer footer footer";
    height: 100vh;
  }

  /* ─── Header ─── */
  .header {
    grid-area: header;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px; height: 56px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    position: relative;
  }
  .header::after {
    content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    opacity: 0.5;
  }
  .logo {
    font-family: 'Orbitron', sans-serif; font-weight: 900; font-size: 22px; letter-spacing: 4px;
    background: linear-gradient(135deg, var(--accent), #007aff);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .logo span { -webkit-text-fill-color: var(--accent2); }

  .header-center { display: flex; align-items: center; gap: 20px; }
  .header-right { display: flex; align-items: center; gap: 16px; }

  .ws-indicator { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--muted); letter-spacing: 1px; }
  .ws-dot { width: 7px; height: 7px; border-radius: 50%; background: #666; transition: background 0.3s; }
  .ws-dot.connected { background: #34c759; box-shadow: 0 0 8px #34c759; animation: pulse 2s infinite; }
  .ws-dot.disconnected { background: var(--accent2); }

  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  /* ─── Cooldown Badge in Header ─── */
  .cooldown-badge {
    display: flex; align-items: center; gap: 8px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 3px; padding: 4px 12px;
    font-size: 11px; letter-spacing: 1px;
  }
  .cooldown-badge.ready { border-color: #34c759; color: #34c759; }
  .cooldown-badge.waiting { border-color: var(--accent2); color: var(--accent2); }
  .cooldown-num {
    font-family: 'Orbitron', sans-serif; font-size: 16px; font-weight: 900;
  }

  /* ─── Cooldown Ring ─── */
  .cooldown-ring { position: relative; width: 36px; height: 36px; }
  .cooldown-ring svg { transform: rotate(-90deg); }
  .cooldown-ring .track { fill: none; stroke: var(--border); stroke-width: 3; }
  .cooldown-ring .progress { fill: none; stroke: var(--accent2); stroke-width: 3; stroke-linecap: round; transition: stroke-dashoffset 0.1s linear; }
  .cooldown-ring .progress.ready { stroke: #34c759; }
  .cooldown-ring-label {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-family: 'Orbitron', sans-serif; font-size: 9px; font-weight: 700; color: var(--accent2);
  }
  .cooldown-ring-label.ready { color: #34c759; }

  /* ─── Sidebar ─── */
  .sidebar {
    padding: 16px; background: var(--surface);
    overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--border) transparent;
  }
  .sidebar::-webkit-scrollbar { width: 4px; }
  .sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  .sidebar-left { grid-area: sidebar-left; border-right: 1px solid var(--border); }
  .sidebar-right { grid-area: sidebar-right; border-left: 1px solid var(--border); }

  .section-title {
    font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 700;
    letter-spacing: 3px; color: var(--muted); text-transform: uppercase;
    margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
  }
  .section-title::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, var(--border), transparent); }

  /* ─── Player Card ─── */
  .player-card {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 4px; padding: 14px; margin-bottom: 20px;
    position: relative; overflow: hidden;
  }
  .player-card::before {
    content: ''; position: absolute; top: 0; left: 0; width: 3px; height: 100%;
    background: var(--player-color, var(--accent));
  }
  .player-name { font-family: 'Orbitron', sans-serif; font-size: 14px; font-weight: 700; color: var(--player-color, var(--accent)); margin-bottom: 6px; }
  .player-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
  .stat { text-align: center; }
  .stat-value { font-family: 'Orbitron', sans-serif; font-size: 20px; font-weight: 900; color: var(--accent); }
  .stat-label { font-size: 9px; letter-spacing: 2px; color: var(--muted); margin-top: 2px; }

  /* ─── Buttons ─── */
  .btn {
    width: 100%; padding: 10px;
    font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 2px;
    border: 1px solid var(--accent); background: transparent; color: var(--accent);
    cursor: pointer; border-radius: 2px; transition: all 0.2s; text-transform: uppercase;
  }
  .btn:hover:not(:disabled) { background: var(--accent); color: var(--bg); box-shadow: 0 0 20px rgba(0,240,255,0.4); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn.danger { border-color: var(--accent2); color: var(--accent2); }
  .btn.danger:hover:not(:disabled) { background: var(--accent2); color: var(--bg); box-shadow: 0 0 20px rgba(255,45,85,0.4); }

  /* ─── Form ─── */
  .field { margin-bottom: 12px; }
  .field label { display: block; font-size: 10px; letter-spacing: 2px; color: var(--muted); margin-bottom: 6px; }
  .field input {
    width: 100%; background: var(--bg); border: 1px solid var(--border);
    border-radius: 2px; color: var(--text);
    font-family: 'Share Tech Mono', monospace; font-size: 13px; padding: 8px 10px;
    outline: none; transition: border-color 0.2s;
  }
  .field input:focus { border-color: var(--accent); }

  .color-picker { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 12px; }
  .color-swatch {
    width: 100%; aspect-ratio: 1; border-radius: 2px; cursor: pointer;
    border: 2px solid transparent; transition: transform 0.15s, border-color 0.15s;
  }
  .color-swatch:hover { transform: scale(1.15); }
  .color-swatch.selected { border-color: white; transform: scale(1.1); }

  /* ─── Leaderboard ─── */
  .leaderboard { display: flex; flex-direction: column; gap: 4px; }
  .lb-entry {
    display: flex; align-items: center; gap: 10px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 3px; padding: 8px 10px;
    position: relative; overflow: hidden; transition: border-color 0.2s;
  }
  .lb-entry.me { border-color: var(--accent); }
  .lb-bar { position: absolute; left: 0; top: 0; height: 100%; opacity: 0.08; transition: width 0.5s ease; }
  .lb-rank { font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 700; color: var(--muted); min-width: 20px; }
  .lb-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .lb-name { flex: 1; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lb-count { font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 700; color: var(--accent); }

  /* ─── Grid ─── */
  .grid-area {
    grid-area: grid;
    display: flex; align-items: center; justify-content: center;
    background: var(--bg); overflow: hidden; position: relative;
    background-image:
      linear-gradient(var(--grid-line) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
    background-size: 40px 40px;
  }
  .grid {
    display: grid; gap: 1px;
    background: rgba(0,240,255,0.04); padding: 1px;
    border: 1px solid var(--border);
  }
  .tile {
    cursor: pointer; transition: filter 0.1s, transform 0.1s;
    position: relative;
  }
  .tile:hover { filter: brightness(1.4); transform: scale(1.05); z-index: 1; }
  .tile.empty { background: #070d16; }
  .tile.empty:hover { background: rgba(0,240,255,0.15); }
  .tile.mine::after { content: ''; position: absolute; inset: 0; border: 1px solid rgba(255,255,255,0.3); }
  .tile.flash { animation: tileFlash 0.4s ease-out; }
  @keyframes tileFlash { 0% { filter: brightness(4) saturate(2); } 100% { filter: brightness(1); } }

  /* ─── Progress ─── */
  .progress-bar { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; margin-top: 8px; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent), #007aff); transition: width 0.5s ease; }

  /* ─── Event Log ─── */
  .event-log { margin-top: 16px; max-height: 140px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
  .event-log::-webkit-scrollbar { width: 2px; }
  .event-log::-webkit-scrollbar-thumb { background: var(--border); }
  .event-item { display: flex; align-items: center; gap: 6px; font-size: 10px; color: var(--muted); padding: 3px 0; border-bottom: 1px solid rgba(26,37,53,0.5); }
  .event-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

  /* ─── Footer ─── */
  .footer {
    grid-area: footer; height: 32px;
    background: var(--surface); border-top: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 20px; font-size: 10px; color: var(--muted); letter-spacing: 1px;
  }

  /* ─── Toast ─── */
  .toast-container { position: fixed; top: 70px; right: 16px; z-index: 3000; display: flex; flex-direction: column; gap: 6px; pointer-events: none; }
  .toast {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 3px; padding: 10px 14px; font-size: 12px;
    animation: toastIn 0.3s ease, toastOut 0.3s ease 2.7s forwards; max-width: 240px;
  }
  .toast.success { border-color: #34c759; color: #34c759; }
  .toast.error { border-color: var(--accent2); color: var(--accent2); }
  .toast.info { border-color: var(--accent); color: var(--accent); }
  @keyframes toastIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes toastOut { from { opacity: 1; } to { opacity: 0; } }

  /* ─── Overlay Base ─── */
  .overlay {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(2,4,8,0.88); backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
  }
  .modal {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 6px; padding: 32px; width: 380px; position: relative;
  }
  .modal::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
  }
  .modal-title { font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 900; letter-spacing: 3px; margin-bottom: 6px; color: var(--accent); }
  .modal-sub { font-size: 11px; color: var(--muted); letter-spacing: 1px; margin-bottom: 24px; }

  /* ─── GAME OVER Overlay ─── */
  .gameover-overlay {
    position: fixed; inset: 0; z-index: 600;
    background: rgba(2,4,8,0.95); backdrop-filter: blur(16px);
    display: flex; align-items: center; justify-content: center;
    animation: fadeIn 0.5s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .gameover-modal {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; padding: 0; width: 520px; overflow: hidden;
    position: relative;
    box-shadow: 0 0 80px rgba(0,240,255,0.1), 0 0 160px rgba(255,45,85,0.05);
  }

  .gameover-header {
    padding: 28px 32px 20px;
    background: linear-gradient(135deg, rgba(0,240,255,0.05), rgba(255,45,85,0.05));
    border-bottom: 1px solid var(--border);
    text-align: center;
    position: relative;
  }
  .gameover-header::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
  }

  .gameover-title {
    font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 700;
    letter-spacing: 6px; color: var(--muted); margin-bottom: 10px;
  }

  .gameover-label {
    font-family: 'Orbitron', sans-serif; font-size: 28px; font-weight: 900;
    letter-spacing: 4px;
    background: linear-gradient(135deg, var(--gold), #ff9500);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    margin-bottom: 4px;
    animation: shimmer 2s infinite;
  }
  @keyframes shimmer {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.4); }
  }

  .winner-card {
    margin: 16px 0 0;
    display: flex; align-items: center; gap: 14px;
    background: rgba(255,215,0,0.06); border: 1px solid rgba(255,215,0,0.2);
    border-radius: 6px; padding: 14px 18px;
  }
  .winner-crown { font-size: 28px; }
  .winner-color { width: 12px; height: 40px; border-radius: 2px; flex-shrink: 0; }
  .winner-info { flex: 1; }
  .winner-name { font-family: 'Orbitron', sans-serif; font-size: 16px; font-weight: 900; color: var(--gold); }
  .winner-tiles { font-size: 11px; color: var(--muted); margin-top: 3px; letter-spacing: 1px; }
  .winner-pct { font-family: 'Orbitron', sans-serif; font-size: 22px; font-weight: 900; color: var(--gold); }

  /* Player's own result banner */
  .my-result {
    margin: 12px 32px 0;
    padding: 10px 16px;
    border-radius: 4px;
    text-align: center;
    font-family: 'Orbitron', sans-serif;
    font-size: 12px; font-weight: 700; letter-spacing: 2px;
  }
  .my-result.won { background: rgba(255,215,0,0.1); border: 1px solid var(--gold); color: var(--gold); }
  .my-result.lost { background: rgba(0,240,255,0.05); border: 1px solid var(--border); color: var(--accent); }

  /* ─── Rankings List ─── */
  .rankings-list {
    padding: 16px 32px; max-height: 240px; overflow-y: auto;
    scrollbar-width: thin; scrollbar-color: var(--border) transparent;
  }
  .rankings-list::-webkit-scrollbar { width: 4px; }
  .rankings-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .rank-row {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px; border-radius: 3px;
    margin-bottom: 4px; position: relative; overflow: hidden;
    border: 1px solid transparent; transition: border-color 0.2s;
  }
  .rank-row.me-row { border-color: var(--accent); background: rgba(0,240,255,0.03); }
  .rank-row.rank-1 { background: rgba(255,215,0,0.06); border-color: rgba(255,215,0,0.3); }
  .rank-row.rank-2 { background: rgba(192,192,192,0.04); border-color: rgba(192,192,192,0.2); }
  .rank-row.rank-3 { background: rgba(205,127,50,0.04); border-color: rgba(205,127,50,0.2); }

  .rank-fill { position: absolute; left: 0; top: 0; height: 100%; opacity: 0.06; }
  .rank-medal { font-size: 14px; min-width: 22px; text-align: center; }
  .rank-num { font-family: 'Orbitron', sans-serif; font-size: 10px; color: var(--muted); min-width: 22px; }
  .rank-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .rank-name { flex: 1; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rank-count { font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 700; }
  .rank-pct { font-size: 10px; color: var(--muted); min-width: 42px; text-align: right; }

  /* ─── Reset Countdown ─── */
  .reset-bar {
    padding: 16px 32px 24px;
    border-top: 1px solid var(--border);
    display: flex; align-items: center; gap: 16px;
  }
  .reset-label { font-size: 11px; color: var(--muted); letter-spacing: 1px; white-space: nowrap; }
  .reset-progress { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
  .reset-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent2), var(--accent));
    transition: width 1s linear;
  }
  .reset-num {
    font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 900;
    color: var(--accent); min-width: 28px; text-align: right;
  }

  @keyframes gridLoad { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
  .grid-container { animation: gridLoad 0.5s ease; }
`;

// ─── Toast ────────────────────────────────────────────────────────────────────

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);
  return { toasts, add };
}

// ─── Cooldown Ring Component ──────────────────────────────────────────────────

function CooldownRing({ remaining, total }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const pct = remaining / total;
  const offset = circ * (1 - pct);
  const ready = remaining <= 0;

  return (
    <div className="cooldown-ring">
      <svg width="36" height="36" viewBox="0 0 36 36">
        <circle className="track" cx="18" cy="18" r={r} />
        <circle
          className={`progress ${ready ? "ready" : ""}`}
          cx="18" cy="18" r={r}
          strokeDasharray={circ}
          strokeDashoffset={ready ? 0 : offset}
        />
      </svg>
      <div className={`cooldown-ring-label ${ready ? "ready" : ""}`}>
        {ready ? "GO" : Math.ceil(remaining)}
      </div>
    </div>
  );
}

// ─── Game Over Overlay ────────────────────────────────────────────────────────

function GameOverOverlay({ gameOver, me, resetIn }) {
  const [countdown, setCountdown] = useState(resetIn);

  useEffect(() => {
    setCountdown(resetIn);
    const iv = setInterval(() => {
      setCountdown(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [resetIn, gameOver]);

  if (!gameOver) return null;

  const { winner, rankings } = gameOver;
  const myRank = rankings.findIndex(r => r.userId === me?.id);
  const isWinner = me && winner.userId === me.id;

  function medal(rank) {
    if (rank === 0) return "🥇";
    if (rank === 1) return "🥈";
    if (rank === 2) return "🥉";
    return null;
  }

  return (
    <div className="gameover-overlay">
      <div className="gameover-modal">

        {/* Header */}
        <div className="gameover-header">
          <div className="gameover-title">— GAME OVER —</div>
          <div className="gameover-label">TERRITORY CONQUERED</div>
          <div className="winner-card">
            <div className="winner-crown">👑</div>
            <div className="winner-color" style={{ background: winner.color }} />
            <div className="winner-info">
              <div className="winner-name">{winner.name}</div>
              <div className="winner-tiles">{winner.count} TILES CAPTURED</div>
            </div>
            <div className="winner-pct">
              {((winner.count / TOTAL_TILES) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Player's own result */}
        {me && (
          <div className={`my-result ${isWinner ? "won" : "lost"}`}>
            {isWinner
              ? "⚡ YOU WIN! TERRITORY DOMINATED ⚡"
              : `YOUR RANK: #${myRank + 1} — ${rankings[myRank]?.count || 0} TILES`}
          </div>
        )}

        {/* Full Rankings */}
        <div className="rankings-list">
          {rankings.map((entry, i) => (
            <div
              key={entry.userId}
              className={[
                "rank-row",
                `rank-${i + 1}`,
                entry.userId === me?.id ? "me-row" : "",
              ].join(" ")}
            >
              <div className="rank-fill" style={{ width: `${(entry.count / (rankings[0]?.count || 1)) * 100}%`, background: entry.color }} />
              {medal(i)
                ? <div className="rank-medal">{medal(i)}</div>
                : <div className="rank-num">#{i + 1}</div>}
              <div className="rank-dot" style={{ background: entry.color }} />
              <div className="rank-name" style={{
                color: i === 0 ? "var(--gold)" : i === 1 ? "var(--silver)" : i === 2 ? "var(--bronze)" : "var(--text)",
                fontWeight: entry.userId === me?.id ? "bold" : "normal",
              }}>
                {entry.name}{entry.userId === me?.id ? " (YOU)" : ""}
              </div>
              <div className="rank-count" style={{
                color: i === 0 ? "var(--gold)" : i === 1 ? "var(--silver)" : i === 2 ? "var(--bronze)" : "var(--accent)",
              }}>
                {entry.count}
              </div>
              <div className="rank-pct">
                {((entry.count / TOTAL_TILES) * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>

        {/* Countdown Bar */}
        <div className="reset-bar">
          <div className="reset-label">NEW GAME IN</div>
          <div className="reset-progress">
            <div className="reset-fill" style={{ width: `${(countdown / resetIn) * 100}%` }} />
          </div>
          <div className="reset-num">{countdown}s</div>
        </div>

      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function GridWars() {
  const [tiles, setTiles] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [me, setMe] = useState(null);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [flashTiles, setFlashTiles] = useState(new Set());
  const [events, setEvents] = useState([]);
  const [showRegister, setShowRegister] = useState(true);
  const [tileSize, setTileSize] = useState(14);
  const [gameOver, setGameOver] = useState(null); // { winner, rankings, resetIn }
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownRef = useRef(null);
  const ws = useRef(null);
  const { toasts, add: toast } = useToast();

  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);

  // ─ Cooldown tick ─
  const startCooldown = useCallback(() => {
    setCooldownRemaining(CAPTURE_COOLDOWN);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldownRemaining(c => {
        if (c <= 0.1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return c - 0.1;
      });
    }, 100);
  }, []);

  // ─ Load tiles ─
  const loadTiles = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/tiles`);
      const data = await r.json();
      setTiles(data || []);
    } catch { toast("Failed to load tiles", "error"); }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/leaderboard`);
      const data = await r.json();
      setLeaderboard(data || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadTiles();
    loadLeaderboard();
    const iv = setInterval(loadLeaderboard, 8000);
    return () => clearInterval(iv);
  }, []);

  // ─ WebSocket ─
  const connectWS = useCallback(() => {
    const wsUrl = API_BASE.replace(/^http/, "ws") + "/ws";
    const sock = new WebSocket(wsUrl);
    ws.current = sock;

    sock.onopen = () => { setWsStatus("connected"); toast("Live connection established", "success"); };
    sock.onclose = () => { setWsStatus("disconnected"); setTimeout(connectWS, 3000); };
    sock.onerror = () => setWsStatus("disconnected");

    sock.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        // Tile update
        if (msg.type === "tile_update") {
          setTiles(prev => prev.map(t => t.id === msg.id ? { ...t, ownerId: msg.ownerId } : t));
          setFlashTiles(f => new Set([...f, msg.id]));
          setTimeout(() => setFlashTiles(f => { const n = new Set(f); n.delete(msg.id); return n; }), 500);
          setEvents(prev => [{
            id: Date.now() + Math.random(),
            tileId: msg.id,
            ownerId: msg.ownerId,
            time: new Date().toLocaleTimeString("en", { hour12: false }),
          }, ...prev.slice(0, 49)]);
          loadLeaderboard();
        }

        // Game over
        if (msg.type === "game_over") {
          setGameOver({ winner: msg.winner, rankings: msg.rankings, resetIn: msg.resetIn });
          toast("🏆 GAME OVER! All tiles captured!", "info");
        }

        // New game started
        if (msg.type === "new_game") {
          setGameOver(null);
          setTiles(prev => prev.map(t => ({ ...t, ownerId: null })));
          setEvents([]);
          setCooldownRemaining(0);
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          toast("🚀 NEW GAME STARTED! Grid reset!", "success");
          loadTiles();
          loadLeaderboard();
        }
      } catch {}
    };
  }, []);

  useEffect(() => {
    connectWS();
    return () => { ws.current?.close(); if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  // ─ Register ─
  const handleRegister = async () => {
    if (!formName.trim()) return toast("Name required", "error");
    const userId = genId();
    try {
      const r = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, name: formName.trim(), color: formColor }),
      });
      if (!r.ok) throw new Error("Registration failed");
      setMe({ id: userId, name: formName.trim(), color: formColor });
      setShowRegister(false);
      toast(`Welcome, ${formName.trim()}!`, "success");
    } catch (err) {
      toast(err.message, "error");
    }
  };

  // ─ Capture ─
  const handleCapture = async (tileId) => {
    if (!me) { toast("Register first!", "error"); return; }
    if (cooldownRemaining > 0) { toast(`Wait ${Math.ceil(cooldownRemaining)}s before next capture`, "error"); return; }
    if (gameOver) { toast("Game is over, wait for new game!", "error"); return; }

    try {
      const r = await fetch(`${API_BASE}/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tileId, userId: me.id }),
      });

      if (r.status === 429) {
        // Server-side cooldown
        const data = await r.json();
        const rem = data.remaining || CAPTURE_COOLDOWN;
        setCooldownRemaining(rem);
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
          setCooldownRemaining(c => {
            if (c <= 0.1) { clearInterval(cooldownRef.current); return 0; }
            return c - 0.1;
          });
        }, 100);
        toast(`Cooldown! ${rem.toFixed(1)}s remaining`, "error");
        return;
      }

      if (!r.ok) {
        toast(await r.text() || "Tile already claimed", "error");
        return;
      }

      const tile = await r.json();
      setTiles(prev => prev.map(t => t.id === tile.id ? { ...t, ownerId: tile.ownerId } : t));
      startCooldown();
      toast(`Tile #${tile.id} captured! ✓`, "success");
    } catch {
      toast("Capture failed", "error");
    }
  };

  // ─ Stats ─
  const myTiles = tiles.filter(t => t.ownerId === me?.id);
  const captured = tiles.filter(t => t.ownerId != null);
  const progress = (captured.length / TOTAL_TILES) * 100;
  const maxCount = leaderboard[0]?.count || 1;

  // ─ Tile size ─
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth - 280 - 260 - 20;
      const vh = window.innerHeight - 56 - 32 - 20;
      setTileSize(Math.max(8, Math.min(Math.floor(Math.min(vw / GRID_COLS, vh / GRID_ROWS)), 24)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isReady = cooldownRemaining <= 0;

  return (
    <>
      <style>{styles}</style>
      <div className="scanline" />

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>)}
      </div>

      {/* Game Over */}
      {gameOver && <GameOverOverlay gameOver={gameOver} me={me} resetIn={gameOver.resetIn} />}

      {/* Register Modal */}
      {showRegister && !gameOver && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-title">GRID WARS</div>
            <div className="modal-sub">CLAIM YOUR TERRITORY // 1000 TILES AT STAKE</div>
            <div className="field">
              <label>COMMANDER NAME</label>
              <input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRegister()}
                placeholder="Enter callsign..."
                autoFocus
              />
            </div>
            <div className="field">
              <label>TERRITORY COLOR</label>
              <div className="color-picker">
                {PRESET_COLORS.map(c => (
                  <div key={c} className={`color-swatch ${formColor === c ? "selected" : ""}`}
                    style={{ background: c }} onClick={() => setFormColor(c)} />
                ))}
              </div>
            </div>
            <button className="btn" onClick={handleRegister}>ENTER THE WAR</button>
          </div>
        </div>
      )}

      <div className="app">

        {/* ─── Header ─── */}
        <header className="header">
          <div className="logo">GRID<span>WAR</span>S</div>

          <div className="header-center">
            {me && (
              <div className={`cooldown-badge ${isReady ? "ready" : "waiting"}`}>
                <CooldownRing remaining={cooldownRemaining} total={CAPTURE_COOLDOWN} />
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 2, marginBottom: 1 }}>NEXT CAPTURE</div>
                  <div className="cooldown-num">
                    {isReady ? "READY" : `${cooldownRemaining.toFixed(1)}s`}
                  </div>
                </div>
              </div>
            )}
            <span style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1 }}>
              {captured.length} / {TOTAL_TILES} TILES
            </span>
          </div>

          <div className="header-right">
            <div className="ws-indicator">
              <div className={`ws-dot ${wsStatus}`} />
              {wsStatus.toUpperCase()}
            </div>
          </div>
        </header>

        {/* ─── Left Sidebar ─── */}
        <aside className="sidebar sidebar-left">
          {me ? (
            <>
              <div className="section-title">COMMANDER</div>
              <div className="player-card" style={{ "--player-color": me.color }}>
                <div className="player-name">{me.name}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1 }}>ID: {me.id.slice(0, 8)}...</div>
                <div className="player-stats">
                  <div className="stat">
                    <div className="stat-value" style={{ color: me.color }}>{myTiles.length}</div>
                    <div className="stat-label">TILES</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">
                      {((myTiles.length / TOTAL_TILES) * 100).toFixed(1)}%
                    </div>
                    <div className="stat-label">CONTROL</div>
                  </div>
                </div>
                <div className="progress-bar" style={{ marginTop: 10 }}>
                  <div className="progress-fill" style={{
                    width: `${(myTiles.length / TOTAL_TILES) * 100}%`,
                    background: `linear-gradient(90deg, ${me.color}, ${darken(me.color, -30)})`,
                  }} />
                </div>
              </div>
              <button className="btn danger" onClick={() => { setMe(null); setShowRegister(true); }}>
                ABANDON POST
              </button>
            </>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 12, textAlign: "center", marginTop: 40 }}>
              Register to join the war
            </div>
          )}

          <div className="section-title" style={{ marginTop: 24 }}>WORLD STATUS</div>
          <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)" }}>
            <span>CONQUEST</span><span>{progress.toFixed(1)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", letterSpacing: 1 }}>
            <span>{captured.length} CLAIMED</span>
            <span>{TOTAL_TILES - captured.length} FREE</span>
          </div>

          {/* Cooldown hint */}
          {me && (
            <div style={{ marginTop: 16, padding: "10px", background: "var(--surface2)", border: `1px solid ${isReady ? "#34c759" : "var(--accent2)"}`, borderRadius: 3, transition: "border-color 0.3s" }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "var(--muted)", marginBottom: 6 }}>CAPTURE COOLDOWN</div>
              <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2, transition: "width 0.1s linear",
                  width: isReady ? "100%" : `${(1 - cooldownRemaining / CAPTURE_COOLDOWN) * 100}%`,
                  background: isReady ? "#34c759" : "var(--accent2)",
                }} />
              </div>
              <div style={{ marginTop: 5, fontSize: 10, color: isReady ? "#34c759" : "var(--accent2)", textAlign: "right", fontFamily: "Orbitron, sans-serif" }}>
                {isReady ? "READY TO FIRE" : `${cooldownRemaining.toFixed(1)}s`}
              </div>
            </div>
          )}

          <div className="section-title" style={{ marginTop: 20 }}>LIVE FEED</div>
          <div className="event-log">
            {events.length === 0
              ? <div style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", padding: "12px 0" }}>Awaiting activity...</div>
              : events.map(ev => {
                const lb = leaderboard.find(l => l.userId === ev.ownerId);
                return (
                  <div key={ev.id} className="event-item">
                    <div className="event-dot" style={{ background: lb?.color || "var(--accent)" }} />
                    <span style={{ flex: 1 }}>
                      <span style={{ color: lb?.color || "var(--accent)" }}>{lb?.name || ev.ownerId?.slice(0, 6) || "?"}</span>
                      {" "}took #{ev.tileId}
                    </span>
                    <span>{ev.time}</span>
                  </div>
                );
              })}
          </div>
        </aside>

        {/* ─── Grid ─── */}
        <main className="grid-area">
          <div className="grid-container">
            <div className="grid" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, ${tileSize}px)` }}>
              {Array.from({ length: TOTAL_TILES }, (_, i) => {
                const tileId = i + 1;
                const tile = tiles.find(t => t.id === tileId);
                const ownerId = tile?.ownerId;
                const owner = ownerId ? leaderboard.find(l => l.userId === ownerId) : null;
                const isMine = !!(me && ownerId && ownerId === me.id);
                const isFlash = flashTiles.has(tileId);
                const canCapture = !ownerId && isReady && !gameOver;

                return (
                  <div
                    key={tileId}
                    className={["tile", ownerId ? "captured" : "empty", isMine ? "mine" : "", isFlash ? "flash" : ""].join(" ")}
                    style={{
                      width: tileSize, height: tileSize,
                      background: ownerId
                        ? (isMine ? (me?.color || "var(--accent)") : (owner?.color || "#333"))
                        : undefined,
                      boxShadow: isMine && me?.color ? `0 0 6px ${me.color}88` : undefined,
                      cursor: canCapture ? "crosshair" : ownerId ? "not-allowed" : !isReady ? "wait" : "default",
                      opacity: gameOver && !ownerId ? 0.4 : 1,
                    }}
                    onClick={() => handleCapture(tileId)}
                    title={ownerId
                      ? `Tile #${tileId} — ${isMine ? "YOURS" : (owner?.name || "Enemy")}`
                      : isReady ? `Tile #${tileId} — click to claim!`
                      : `Tile #${tileId} — cooldown ${cooldownRemaining.toFixed(1)}s`}
                  />
                );
              })}
            </div>
          </div>
        </main>

        {/* ─── Right Sidebar ─── */}
        <aside className="sidebar sidebar-right">
          <div className="section-title">LEADERBOARD</div>
          <div className="leaderboard">
            {leaderboard.length === 0
              ? <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", padding: "12px 0" }}>No commanders yet</div>
              : leaderboard.map((entry, i) => (
                <div key={entry.userId} className={`lb-entry ${entry.userId === me?.id ? "me" : ""}`}>
                  <div className="lb-bar" style={{ width: `${(entry.count / maxCount) * 100}%`, background: entry.color }} />
                  <div className="lb-rank">#{i + 1}</div>
                  <div className="lb-dot" style={{ background: entry.color }} />
                  <div className="lb-name" style={{ color: entry.userId === me?.id ? "var(--accent)" : "var(--text)" }}>
                    {entry.name}
                  </div>
                  <div className="lb-count">{entry.count}</div>
                </div>
              ))}
          </div>

          <div className="section-title" style={{ marginTop: 20 }}>HOW TO PLAY</div>
          <div style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.9, letterSpacing: 0.5 }}>
            <div>→ Click unclaimed tile to capture it</div>
            <div>→ <span style={{ color: "var(--accent2)" }}>5s cooldown</span> between captures</div>
            <div>→ Each tile can only be claimed once</div>
            <div>→ Most tiles when grid fills = <span style={{ color: "var(--gold)" }}>WIN</span></div>
            <div>→ Grid resets for a new round</div>
          </div>

          <div style={{ marginTop: 16, padding: "10px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 3 }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "var(--muted)", marginBottom: 8 }}>TILE LEGEND</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { color: "#070d16", border: "1px solid var(--border)", label: "Free — click to capture" },
                { color: me?.color || "var(--accent)", label: "Your territory" },
                { color: "#666", label: "Enemy territory" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "var(--muted)" }}>
                  <div style={{ width: 12, height: 12, background: item.color, border: item.border, flexShrink: 0, borderRadius: 1 }} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ─── Footer ─── */}
        <footer className="footer">
          <span>GRID WARS // REAL-TIME TERRITORY CONTROL</span>
          <span>{TOTAL_TILES} TILES // {GRID_COLS}×{GRID_ROWS} // 5s COOLDOWN</span>
          <span>WS: {wsStatus.toUpperCase()}</span>
        </footer>

      </div>
    </>
  );
}
