// src/components/RightPanel.jsx
import { useMemo } from 'react';
import { useGameStore } from '../store/useGameStore';

export default function RightPanel() {
  const leaderboard = useGameStore((s) => s.leaderboard);
  const player = useGameStore((s) => s.player);
  const tiles = useGameStore((s) => s.tiles);

  // Build minimap data: sample 200 tiles for the preview
  const minimapTiles = useMemo(() => {
    if (!tiles.length) return [];
    // Show all 1000 in a 40x25 mini grid using css
    return tiles.slice(0, 400);
  }, [tiles]);

  const myRank = useMemo(() => {
    if (!player) return null;
    const idx = leaderboard.findIndex(
      (e) => e.user_id === player.id || e.id === player.id || e.name === player.name
    );
    return idx >= 0 ? idx + 1 : null;
  }, [leaderboard, player]);

  return (
    <aside style={styles.panel}>
      {/* Leaderboard */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <span style={styles.sectionNum}>01</span> LEADERBOARD
          {myRank && <span style={styles.myRankBadge}>#{myRank}</span>}
        </div>

        <div style={styles.lbList}>
          {leaderboard.length === 0 && (
            <div style={styles.empty}>No combatants ranked yet</div>
          )}
          {leaderboard.slice(0, 15).map((entry, i) => {
            const isMe =
              entry.user_id === player?.id ||
              entry.id === player?.id ||
              entry.name === player?.name;
            const count = entry.tile_count ?? entry.tiles ?? entry.count ?? 0;

            return (
              <div key={entry.user_id || entry.id || i} style={{
                ...styles.lbRow,
                background: isMe ? 'rgba(255,212,0,0.06)' : 'transparent',
                borderLeft: isMe ? '2px solid var(--yellow)' : '2px solid transparent',
              }}>
                <RankNum rank={i + 1} />
                <div style={{ ...styles.dot, background: entry.color || '#555', boxShadow: `0 0 6px ${entry.color || '#555'}55` }} />
                <div style={styles.entryName}>{entry.name}</div>
                <div style={styles.entryScore}>{count}</div>
                <div style={styles.entryBar}>
                  <div style={{
                    height: '100%',
                    background: entry.color || '#555',
                    width: `${Math.min(100, (count / Math.max(1, leaderboard[0]?.tile_count ?? leaderboard[0]?.tiles ?? 1)) * 100)}%`,
                    opacity: 0.5,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Territory Overview */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <span style={styles.sectionNum}>02</span> TERRITORY MAP
        </div>
        <div style={styles.minimap}>
          {tiles.map((t) => (
            <div
              key={t.id}
              style={{
                background: t.owner_id ? (t.owner_color || '#555') : 'var(--bg-raised)',
                opacity: t.owner_id ? 0.85 : 0.25,
              }}
            />
          ))}
        </div>
        <div style={styles.minimapLegend}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {leaderboard.slice(0, 6).map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, background: e.color, borderRadius: 1 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)' }}>{e.name?.slice(0, 6)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Battle Stats */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <span style={styles.sectionNum}>03</span> BATTLE STATS
        </div>
        <div style={styles.battleStats}>
          <BattleStat label="Combatants" value={leaderboard.length} />
          <BattleStat
            label="Tiles Claimed"
            value={tiles.filter((t) => t.owner_id).length}
            color="var(--orange)"
          />
          <BattleStat
            label="Neutral"
            value={tiles.filter((t) => !t.owner_id).length}
            color="var(--text-dim)"
          />
          <BattleStat
            label="Top Commander"
            value={leaderboard[0]?.name ?? '—'}
            color={leaderboard[0]?.color ?? 'var(--text-med)'}
            text
          />
        </div>
      </div>
    </aside>
  );
}

function RankNum({ rank }) {
  const colors = ['var(--yellow)', '#C0C0C0', '#CD7F32'];
  const medals = ['⬡', '⬡', '⬡'];
  return (
    <div style={{
      fontFamily: 'var(--font-display)',
      fontSize: 16,
      color: colors[rank - 1] || 'var(--text-dim)',
      width: 22,
      textAlign: 'center',
      flexShrink: 0,
      textShadow: rank <= 3 ? `0 0 8px ${colors[rank - 1]}` : 'none',
    }}>
      {rank}
    </div>
  );
}

function BattleStat({ label, value, color = 'var(--cyan)', text = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border-dim)' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</span>
      <span style={{
        fontFamily: text ? 'var(--font-ui)' : 'var(--font-display)',
        fontSize: text ? 11 : 16,
        color,
        letterSpacing: 1,
        maxWidth: 80,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>{value}</span>
    </div>
  );
}

const styles = {
  panel: {
    width: 210,
    flexShrink: 0,
    background: 'var(--bg-panel)',
    borderLeft: '1px solid var(--border-dim)',
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
  myRankBadge: {
    marginLeft: 'auto',
    color: 'var(--yellow)',
    fontFamily: 'var(--font-display)',
    fontSize: 14,
    letterSpacing: 1,
  },
  lbList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    maxHeight: 280,
    overflowY: 'auto',
  },
  lbRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 6px',
    transition: 'background 0.2s',
    cursor: 'default',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    flexShrink: 0,
  },
  entryName: {
    flex: 1,
    fontFamily: 'var(--font-ui)',
    fontSize: 12,
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    letterSpacing: 0.5,
  },
  entryScore: {
    fontFamily: 'var(--font-display)',
    fontSize: 14,
    color: 'var(--cyan)',
    letterSpacing: 1,
    flexShrink: 0,
  },
  entryBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    display: 'none',
  },
  empty: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-dim)',
    padding: '8px 0',
    fontStyle: 'italic',
  },
  minimap: {
    display: 'grid',
    gridTemplateColumns: 'repeat(40, 1fr)',
    gap: '0.5px',
    background: 'var(--border-dim)',
    border: '1px solid var(--border-med)',
    imageRendering: 'pixelated',
  },
  minimapLegend: {
    marginTop: 6,
  },
  battleStats: {
    display: 'flex',
    flexDirection: 'column',
  },
};
