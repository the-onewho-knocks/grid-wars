// src/hooks/useTiles.js
import { useCallback, useEffect } from 'react';
import { api } from '../utils/api';
import { useGameStore } from '../store/useGameStore';

export function useTiles() {
  const setTiles = useGameStore((s) => s.setTiles);
  const updateTile = useGameStore((s) => s.updateTile);
  const markCapture = useGameStore((s) => s.markCapture);
  const addLog = useGameStore((s) => s.addLog);
  const addNotif = useGameStore((s) => s.addNotif);
  const player = useGameStore((s) => s.player);
  const tiles = useGameStore((s) => s.tiles);

  const fetchTiles = useCallback(async () => {
    try {
      const data = await api.getTiles();
      setTiles(Array.isArray(data) ? data : []);
    } catch (e) {
      addLog('Failed to load tiles: ' + e.message, 'error');
    }
  }, [setTiles, addLog]);

  useEffect(() => {
    fetchTiles();
  }, [fetchTiles]);

  const capture = useCallback(
    async (tileId) => {
      if (!player) {
        addNotif('Register first to capture tiles!', 'warn');
        return;
      }
      const tile = tiles.find((t) => t.id === tileId);
      if (tile?.owner_id === player.id) return; // already ours

      // Optimistic update
      const prev = { ...tile };
      updateTile(tileId, {
        owner_id: player.id,
        owner_name: player.name,
        owner_color: player.color,
      });
      markCapture(tileId);

      try {
        await api.capture(player.id, tileId);
        addLog(`You captured tile #${tileId}`, 'own');
      } catch (e) {
        // Rollback
        updateTile(tileId, prev);
        addNotif('Capture failed: ' + e.message, 'error');
        addLog(`Capture #${tileId} failed: ${e.message}`, 'error');
      }
    },
    [player, tiles, updateTile, markCapture, addLog, addNotif]
  );

  return { fetchTiles, capture };
}
