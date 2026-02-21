// src/components/TileGrid.jsx
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useGameStore } from '../store/useGameStore';

const COLS = 40;
const ROWS = 25;

export default function TileGrid({ onCapture }) {
  const tiles = useGameStore((s) => s.tiles);
  const recentCaptures = useGameStore((s) => s.recentCaptures);
  const player = useGameStore((s) => s.player);

  const containerRef = useRef(null);
  const [tileSize, setTileSize] = useState(20);
  const [tooltip, setTooltip] = useState(null); // { x, y, tile }

  // Calculate tile size to fill available space
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const byW = Math.floor((width - 2) / COLS);
      const byH = Math.floor((height - 2) / ROWS);
      setTileSize(Math.max(8, Math.min(byW, byH, 28)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Build lookup for fast render
  const tileMap = useMemo(() => {
    const m = {};
    tiles.forEach((t) => { m[t.id] = t; });
    return m;
  }, [tiles]);

  const handleTileClick = useCallback((id) => {
    onCapture(id);
  }, [onCapture]);

  const gridWidth = COLS * tileSize + (COLS - 1);
  const gridHeight = ROWS * tileSize + (ROWS - 1);

  // Render tiles as flat array 1-1000
  const tileIds = useMemo(() => Array.from({ length: 1000 }, (_, i) => i + 1), []);

  return (
    <div ref={containerRef} style={styles.container}>
      {/* Scanline overlay */}
      <div style={styles.scanlines} />

      <div
        style={{
          ...styles.grid,
          gridTemplateColumns: `repeat(${COLS}, ${tileSize}px)`,
          gridTemplateRows: `repeat(${ROWS}, ${tileSize}px)`,
          width: gridWidth,
          height: gridHeight,
        }}
      >
        {tileIds.map((id) => {
          const tile = tileMap[id] || { id };
          const owned = !!tile.owner_id;
          const isMe = tile.owner_id === player?.id;
          const flash = !!recentCaptures[id];
          const color = tile.owner_color || tile.color;

          return (
            <div
              key={id}
              style={{
                width: tileSize,
                height: tileSize,
                background: owned ? color : 'var(--bg-raised)',
                outline: isMe ? '1px solid rgba(255,255,255,0.35)' : (owned ? '1px solid rgba(0,0,0,0.4)' : '1px solid var(--border-dim)'),
                cursor: 'crosshair',
                transition: flash ? 'none' : 'filter 0.1s',
                filter: flash ? 'brightness(4)' : (isMe ? 'brightness(1.1)' : 'brightness(0.85)'),
                animation: flash ? 'captureFlash 0.5s ease forwards' : 'none',
                position: 'relative',
              }}
              onClick={() => handleTileClick(id)}
              onMouseEnter={(e) => {
                setTooltip({
                  x: e.clientX,
                  y: e.clientY,
                  tile,
                });
              }}
              onMouseMove={(e) => {
                setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null);
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          ...styles.tooltip,
          left: tooltip.x + 14,
          top: tooltip.y - 36,
        }}>
          {tooltip.tile.owner_id ? (
            <>
              <span style={{ color: tooltip.tile.owner_color || '#fff', fontWeight: 700 }}>
                {tooltip.tile.owner_name || tooltip.tile.owner_id?.slice(0, 8)}
              </span>
              {tooltip.tile.owner_id === player?.id && ' (you)'}
              <br />
              <span style={{ color: 'var(--text-dim)' }}>Tile #{tooltip.tile.id}</span>
            </>
          ) : (
            <>
              <span style={{ color: 'var(--text-med)' }}>Unclaimed</span>
              <br />
              <span style={{ color: 'var(--text-dim)' }}>Tile #{tooltip.tile.id}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-void)',
    position: 'relative',
    overflow: 'hidden',
  },
  scanlines: {
    position: 'absolute',
    inset: 0,
    background: `repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.05) 2px,
      rgba(0,0,0,0.05) 4px
    )`,
    pointerEvents: 'none',
    zIndex: 10,
  },
  grid: {
    display: 'grid',
    gap: '1px',
    background: 'var(--border-dim)',
    border: '1px solid var(--border-med)',
    animation: 'gridAppear 0.5s ease',
    imageRendering: 'pixelated',
  },
  tooltip: {
    position: 'fixed',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-bright)',
    padding: '6px 10px',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    lineHeight: 1.6,
    pointerEvents: 'none',
    zIndex: 100,
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
  },
};
