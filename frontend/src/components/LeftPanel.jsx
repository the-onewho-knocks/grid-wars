// src/components/LeftPanel.jsx
import { useRef, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';

export default function LeftPanel() {
  const player = useGameStore((s) => s.player);
  const clearPlayer = useGameStore((s) => s.clearPlayer);
  const tiles = useGameStore((s) => s.tiles);
  const logs = useGameStore((s) => s.logs);
  const wsStatus = useGameStore((s) => s.wsStatus);
  const addLog = useGameStore((s) => s.addLog);

  const logRef = useRef(null);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const myTiles = player ? tiles.filter((t) => t.owner_id === player.id).length : 0;
  const total = tiles.length;

  const handleAbandon = () => {
    clearPlayer();
    addLog('Commander abandoned the battlefield', 'system');
    // Also clear persisted state
    localStorage.removeItem('grid-war-player');
  };

  return (
    <aside style={styles.panel}>
      {/* Player section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <span style={styles.sectionNum}>01</span> COMMANDER
        </div>

        {player ? (
          <div style={styles.playerCard}>
            {/* Color bar */}
            <div style={{ height: 3, background: player.color, marginBottom: 12, boxShadow: `0 0 10px ${player.color}` }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32,
                background: player.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                color: '#000',
                flexShrink: 0,
              }}>
                {player.name[0].toUpperCase()}
              </div>
              <div>
                <div style={styles.playerName}>{player.name}</div>
                <div style={styles.playerId}>ID: {player.id?.slice(0, 12)}...</div>
              </div>
            </div>

            <div style={styles.statsRow}>
              <div style={styles.miniStat}>
                <div style={{ color: player.color, fontFamily: 'var(--font-display)', fontSize: 24 }}>{myTiles}</div>
                <div style={styles.miniLabel}>TILES</div>
              </div>
              <div style={styles.miniStat}>
                <div style={{ color: 'var(--yellow)', fontFamily: 'var(--font-display)', fontSize: 24 }}>
                  {total > 0 ? ((myTiles / total) * 100).toFixed(1) : '0.0'}%
                </div>
                <div style={styles.miniLabel}>CONTROL</div>
              </div>
            </div>

            <button style={styles.abandonBtn} onClick={handleAbandon}>
              ✕ ABANDON POST
            </button>
          </div>
        ) : (
          <div style={styles.noPlayer}>
            <div style={styles.noPlayerIcon}>⚔</div>
            <div style={styles.noPlayerText}>No commander active</div>
            <div style={styles.noPlayerSub}>Register to deploy</div>
          </div>
        )}
      </div>

      {/* Connection status */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <span style={styles.sectionNum}>02</span> CHANNEL
        </div>
        <StatusRow label="WebSocket" status={wsStatus} />
        <StatusRow label="API" status="connected" />
      </div>

      {/* Combat log */}
      <div style={{ ...styles.section, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={styles.sectionTitle}>
          <span style={styles.sectionNum}>03</span> COMBAT LOG
          <span style={styles.logCount}>{logs.length}</span>
        </div>
        <div style={styles.logWrap} ref={logRef}>
          {logs.length === 0 && (
            <div style={styles.emptyLog}>Awaiting field reports...</div>
          )}
          {logs.map((log) => (
            <LogEntry key={log.id} log={log} />
          ))}
        </div>
      </div>
    </aside>
  );
}

function LogEntry({ log }) {
  const colors = {
    own: 'var(--green)',
    enemy: 'var(--red)',
    system: 'var(--cyan)',
    capture: 'var(--yellow)',
    error: 'var(--red)',
  };
  const borders = {
    own: 'var(--green)',
    enemy: 'var(--red)',
    system: 'var(--cyan)',
    capture: 'var(--yellow)',
    error: 'var(--red)',
  };

  const ts = log.ts instanceof Date
    ? log.ts.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '';

  return (
    <div style={{
      ...styles.logEntry,
      borderLeftColor: borders[log.type] || 'var(--border-bright)',
      animation: 'fadeSlideRight 0.25s ease',
    }}>
      <span style={{ color: 'var(--text-dim)', fontSize: 9, marginRight: 6, fontFamily: 'var(--font-mono)' }}>{ts}</span>
      <span style={{ color: colors[log.type] || 'var(--text-med)', fontSize: 11 }}>{log.text}</span>
    </div>
  );
}

function StatusRow({ label, status }) {
  const c = status === 'connected' ? 'var(--green)' : status === 'reconnecting' ? 'var(--yellow)' : 'var(--red)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border-dim)' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: c, letterSpacing: 1 }}>
        {status.toUpperCase()}
      </span>
    </div>
  );
}

const styles = {
  panel: {
    width: 224,
    flexShrink: 0,
    background: 'var(--bg-panel)',
    borderRight: '1px solid var(--border-dim)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  section: {
    borderBottom: '1px solid var(--border-dim)',
    padding: '12px 14px',
  },
  sectionTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: 3,
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    marginBottom: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  sectionNum: {
    color: 'var(--cyan)',
  },
  logCount: {
    marginLeft: 'auto',
    background: 'var(--bg-raised)',
    color: 'var(--text-dim)',
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    padding: '1px 5px',
  },
  playerCard: {
    animation: 'fadeSlideIn 0.3s ease',
  },
  playerName: {
    fontFamily: 'var(--font-display)',
    fontSize: 18,
    letterSpacing: 2,
    lineHeight: 1.1,
  },
  playerId: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    color: 'var(--text-dim)',
    letterSpacing: 1,
  },
  statsRow: {
    display: 'flex',
    gap: 12,
    margin: '10px 0',
    padding: '10px',
    background: 'var(--bg-raised)',
    border: '1px solid var(--border-dim)',
  },
  miniStat: {
    flex: 1,
    textAlign: 'center',
  },
  miniLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 8,
    letterSpacing: 2,
    color: 'var(--text-dim)',
    marginTop: 2,
  },
  abandonBtn: {
    width: '100%',
    background: 'transparent',
    border: '1px solid var(--border-med)',
    color: 'var(--text-dim)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: 2,
    padding: '7px',
    cursor: 'pointer',
    transition: 'border-color 0.2s, color 0.2s',
  },
  noPlayer: {
    textAlign: 'center',
    padding: '16px 0',
  },
  noPlayerIcon: {
    fontSize: 28,
    marginBottom: 8,
    filter: 'grayscale(1)',
    opacity: 0.3,
  },
  noPlayerText: {
    fontFamily: 'var(--font-ui)',
    fontSize: 12,
    color: 'var(--text-dim)',
    letterSpacing: 1,
  },
  noPlayerSub: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-dim)',
    marginTop: 4,
  },
  logWrap: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    paddingTop: 4,
  },
  logEntry: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 0,
    padding: '3px 6px',
    borderLeft: '2px solid transparent',
    lineHeight: 1.5,
  },
  emptyLog: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-dim)',
    padding: '8px 6px',
    fontStyle: 'italic',
  },
};
