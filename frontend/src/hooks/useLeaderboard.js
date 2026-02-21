// src/hooks/useLeaderboard.js
import { useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useGameStore } from '../store/useGameStore';

export function useLeaderboard(pollInterval = 12000) {
  const setLeaderboard = useGameStore((s) => s.setLeaderboard);

  const fetch = useCallback(async () => {
    try {
      const data = await api.getLeaderboard();
      if (Array.isArray(data)) setLeaderboard(data);
    } catch (_) {}
  }, [setLeaderboard]);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, pollInterval);
    return () => clearInterval(id);
  }, [fetch, pollInterval]);

  return { refetch: fetch };
}
