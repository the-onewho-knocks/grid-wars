// src/store/useGameStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useGameStore = create(
  persist(
    (set, get) => ({
      // Player
      player: null,
      setPlayer: (player) => set({ player }),
      clearPlayer: () => set({ player: null }),

      // Tiles: array of { id, owner_id, owner_name, owner_color }
      tiles: [],
      setTiles: (tiles) => set({ tiles }),
      updateTile: (tileId, patch) =>
        set((state) => ({
          tiles: state.tiles.map((t) =>
            t.id === tileId ? { ...t, ...patch } : t
          ),
        })),

      // Leaderboard: array of { name, color, tile_count }
      leaderboard: [],
      setLeaderboard: (lb) => set({ leaderboard: lb }),

      // Recent captures (for flash animation)
      recentCaptures: {},
      markCapture: (tileId) => {
        set((state) => ({
          recentCaptures: { ...state.recentCaptures, [tileId]: Date.now() },
        }));
        setTimeout(() => {
          set((state) => {
            const next = { ...state.recentCaptures };
            delete next[tileId];
            return { recentCaptures: next };
          });
        }, 600);
      },

      // Connection status
      wsStatus: 'disconnected', // 'connected' | 'disconnected' | 'reconnecting'
      setWsStatus: (s) => set({ wsStatus: s }),

      // Combat log
      logs: [],
      addLog: (text, type = 'capture') =>
        set((state) => ({
          logs: [
            ...state.logs.slice(-120),
            { id: Date.now() + Math.random(), text, type, ts: new Date() },
          ],
        })),

      // Notifications
      notifications: [],
      addNotif: (text, variant = 'info') => {
        const id = Date.now() + Math.random();
        set((state) => ({
          notifications: [...state.notifications, { id, text, variant }],
        }));
        setTimeout(() => {
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          }));
        }, 3200);
      },
      removeNotif: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
    }),
    {
      name: 'grid-war-player',
      partialize: (state) => ({ player: state.player }),
    }
  )
);
