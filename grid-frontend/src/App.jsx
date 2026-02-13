import { useState, useEffect, useCallback } from "react";
import { getTiles, captureTile } from "./api/client";
import { useWebSocket } from "./hooks/useWebSocket";
import Grid from "./components/grid";
import Leaderboard from "./components/leaderboard";
import Register from "./components/register";
import "./styles.css";

function App() {
  const [tilesMap, setTilesMap] = useState(new Map());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTiles() {
      try {
        const tiles = await getTiles();
        const map = new Map();

        tiles.slice(0, 1000).forEach((t) => {
          map.set(t.id, {
            ...t,
            color: null,
          });
        });

        setTilesMap(map);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadTiles();
  }, []);

  const handleTileClick = async (tileId) => {
    if (!user) return;

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
      console.error(err.message);
    }
  };

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

  if (loading) return <div className="loading">Loading grid...</div>;

  return (
    <div className="app">
      {!user && <Register onRegistered={setUser} />}
      <Grid tilesMap={tilesMap} onTileClick={handleTileClick} />
      <Leaderboard />
    </div>
  );
}

export default App;