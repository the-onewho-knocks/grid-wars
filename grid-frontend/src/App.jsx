import { useState, useEffect, useCallback } from "react";
import { getTiles, captureTile, getLeaderboard } from "./api/client";
import { useWebSocket } from "./hooks/useWebSocket";
import Grid from "./components/grid";
import Leaderboard from "./components/leaderboard";
import Register from "./components/register";

function App() {
  const [tilesMap, setTilesMap] = useState(new Map());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // 🔥 Load tiles + leaderboard together (for color mapping)
  useEffect(() => {
    async function loadData() {
      try {
        const [tiles, leaders] = await Promise.all([
          getTiles(),
          getLeaderboard(),
        ]);

        const colorMap = {};
        leaders.forEach((u) => {
          colorMap[u.userId] = u.color;
        });

        const map = new Map();

        tiles.forEach((t) => {
          map.set(t.id, {
            ...t,
            color: t.ownerId ? colorMap[t.ownerId] : null,
          });
        });

        setTilesMap(map);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // 🔥 Handle click
  const handleTileClick = async (tileId) => {
    if (!user) return;

    const tile = tilesMap.get(tileId);

    if (tile.ownerId) {
      setMessage("This tile is already collected!");
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    try {
      await captureTile({
        tileId,
        userId: user.id,
      });

      setTilesMap((prev) => {
        const newMap = new Map(prev);
        const tile = newMap.get(tileId);

        newMap.set(tileId, {
          ...tile,
          ownerId: user.id,
          color: user.color,
        });

        return newMap;
      });
    } catch (err) {
      setMessage("This tile is already collected!");
      setTimeout(() => setMessage(null), 2000);
    }
  };

  // 🔥 WebSocket update handler
  const handleTileUpdate = useCallback((data) => {
    setTilesMap((prev) => {
      const newMap = new Map(prev);
      const tile = newMap.get(data.tileId);
      if (!tile) return prev;

      newMap.set(data.tileId, {
        ...tile,
        ownerId: data.ownerId,
      });

      return newMap;
    });
  }, []);

  useWebSocket(handleTileUpdate);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="app">
      {!user && <Register onRegistered={setUser} />}
      <Grid tilesMap={tilesMap} onTileClick={handleTileClick} />
      <Leaderboard />

      {message && (
        <div className="popup">
          {message}
        </div>
      )}
    </div>
  );
}

export default App;