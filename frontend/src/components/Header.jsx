// src/components/Header.jsx
import { useGameStore } from '../store/useGameStore';

export default function Header() {
  const player = useGameStore((s) => s.player);
  const tiles = useGameStore((s) => s.tiles);
  const wsStatus = useGameStore((s) => s.wsStatus);

  const total = tiles.length;
  const claimed = tiles.filter((t) => t.owner_id).length;
  const mine = player ? tiles.filter((t) => t.owner_id === player.id).length : 0;
  const pct = total > 0 ? ((claimed / total) * 100).toFixed(1) : '0.0';
  const myPct = total > 0 ? ((mine / total) * 100).toFixed(1) : '0.0';

  const wsColors = {
    connected: 'var(--green)',
    disconnected: 'var(--red)',
    reconnecting: 'var(--yellow)',
  };

  return (
    <header style={styles.header}>
      {/* Animated war line */}
      <div style={styles.warLine} />

      {/* Logo */}
      <div style={styles.logo}>
        GRID<span style={{ color: 'var(--yellow)' }}>WAR</span>
      </div>

      {/* Divider */}
      <div style={styles.sep} />

      {/* Stats */}
      <div style={styles.stats}>
        <StatChip label="TILES" value={total} />
        <StatChip label="CONTESTED" value={claimed} accent="var(--orange)" />
        <StatChip label="UNCLAIMED" value={total - claimed} accent="var(--text-med)" />
        <StatChip label="MAP %" value={`${pct}%`} accent="var(--yellow)" />
        {player && (
          <>
            <div style={styles.statDivider} />
            <StatChip label="YOUR TILES" value={mine} accent={player.color} />
            <StatChip label="YOUR %" value={`${myPct}%`} accent={player.color} />
          </>
        )}
      </div>

      {/* Right side */}
      <div style={styles.right}>
        {player && (
          <div style={styles.playerBadge}>
            <div style={{ ...styles.playerDot, background: player.color, boxShadow: `0 0 8px ${player.color}` }} />
            <span style={styles.playerName}>{player.name}</span>
          </div>
        )}

        <div style={styles.wsChip}>
          <div style={{
            ...styles.wsDot,
            background: wsColors[wsStatus] || 'var(--text-dim)',
            animation: wsStatus === 'connected' ? 'pulse-dot 2s infinite' : 'none',
          }} />
          <span style={{ color: wsColors[wsStatus], fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 2 }}>
            {wsStatus.toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}

function StatChip({ label, value, accent = 'var(--cyan)' }) {
  return (
    <div style={styles.stat}>
      <span style={styles.statLabel}>{label}</span>
      <span style={{ ...styles.statValue, color: accent }}>{value}</span>
    </div>
  );
}

const styles = {
  header: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '0 20px',
    height: 52,
    background: 'var(--bg-panel)',
    borderBottom: '1px solid var(--border-dim)',
    overflow: 'hidden',
    flexShrink: 0,
  },
  warLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    background: 'linear-gradient(90deg, var(--red), var(--orange), var(--yellow), var(--green), var(--cyan), var(--blue), var(--red))',
    backgroundSize: '200% 100%',
    animation: 'warline-scroll 4s linear infinite',
  },
  logo: {
    fontFamily: 'var(--font-display)',
    fontSize: 26,
    letterSpacing: 5,
    color: 'var(--red)',
    textShadow: 'var(--glow-red)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  sep: {
    width: 1,
    height: 28,
    background: 'var(--border-med)',
    flexShrink: 0,
  },
  stats: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    flex: 1,
    overflow: 'hidden',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    flexShrink: 0,
  },
  statLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 8,
    letterSpacing: 2,
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: 'var(--font-display)',
    fontSize: 18,
    letterSpacing: 1,
    lineHeight: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    background: 'var(--border-dim)',
  },
  right: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    flexShrink: 0,
  },
  playerBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '4px 10px',
    background: 'var(--bg-raised)',
    border: '1px solid var(--border-med)',
  },
  playerDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    flexShrink: 0,
  },
  playerName: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    letterSpacing: 1,
    color: 'var(--text-bright)',
  },
  wsChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  wsDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
  },
};
