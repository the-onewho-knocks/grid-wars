// src/hooks/useWebSocket.js
import { useEffect, useRef, useCallback } from 'react';
import { WS_BASE } from '../utils/api';
import { useGameStore } from '../store/useGameStore';

export function useWebSocket() {
  const wsRef = useRef(null);
  const retryRef = useRef(null);
  const retryCount = useRef(0);

  const player = useGameStore((s) => s.player);
  const setWsStatus = useGameStore((s) => s.setWsStatus);
  const updateTile = useGameStore((s) => s.updateTile);
  const markCapture = useGameStore((s) => s.markCapture);
  const addLog = useGameStore((s) => s.addLog);
  const addNotif = useGameStore((s) => s.addNotif);
  const setLeaderboard = useGameStore((s) => s.setLeaderboard);

  const connect = useCallback(() => {
    if (!player?.id) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setWsStatus('reconnecting');

    const url = `${WS_BASE}/ws?user_id=${player.id}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retryCount.current = 0;
      setWsStatus('connected');
      addLog('Secure channel established', 'system');
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      addLog('Channel lost — reconnecting...', 'system');
      const delay = Math.min(1000 * 2 ** retryCount.current, 30000);
      retryCount.current += 1;
      retryRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        // Support multiple message shapes the server might send
        const tileId = msg.tile_id ?? msg.id;
        const ownerId = msg.owner_id ?? msg.user_id;
        const ownerName = msg.name ?? msg.owner_name ?? msg.username;
        const ownerColor = msg.color ?? msg.owner_color;

        if (tileId !== undefined) {
          updateTile(tileId, {
            owner_id: ownerId,
            owner_name: ownerName,
            owner_color: ownerColor,
          });
          markCapture(tileId);

          if (ownerId === player.id) {
            addLog(`You seized tile #${tileId}`, 'own');
          } else {
            addLog(`${ownerName || 'Unknown'} captured tile #${tileId}`, 'enemy');
          }
        }

        // Leaderboard update broadcast
        if (msg.type === 'leaderboard' && Array.isArray(msg.data)) {
          setLeaderboard(msg.data);
        }
      } catch (_) {
        // ignore malformed
      }
    };
  }, [player, setWsStatus, updateTile, markCapture, addLog, addNotif, setLeaderboard]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(retryRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  return wsRef;
}
