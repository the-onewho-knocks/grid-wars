import { useEffect, useState, useCallback } from "react";
import { fetchTiles, fetchLeaderboard } from "./api/api";
// import Grid from "./components/Grid";
// import Leaderboard from "./components/Leaderboard";
// import Register from "./components/Register";
import useWebSocket from "./hooks/useWebSockets";

export default function App() {
  const [tiles, setTiles] = useState(() => new Map());
  const [leaderboard, setLeaderboard] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const tilesData = await fetchTiles();
        const map = new Map();
        tilesData.forEach((tile) => {
          map.set(tile.id, tile);
        });
        setTiles(map);

        const lb = await fetchLeaderboard();
        setLeaderboard(lb);

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }

    load();
  }, []);

  useWebSocket(user, (message) => {
    if (message.type === "tile_update") {
      setTiles((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(message.tileId);
        newMap.set(message.tileId, {
          ...existing,
          ownerId: message.ownerId,
        });
        return newMap;
      });
    }
  });

  const refreshLeaderboard = useCallback(async () => {
    const lb = await fetchLeaderboard();
    setLeaderboard(lb);
  }, []);

  const userColorMap = {};
  leaderboard.forEach((player) => {
    userColorMap[player.userId] = player.color;
  });

  if (loading) return <div style={{ padding: 20 }}>Loading grid...</div>;
  if (error) return <div style={{ padding: 20 }}>Error: {error}</div>;

  return (
    <div className="app">
      <div className="grid-container">
        <Grid
          tiles={tiles}
          user={user}
          userColorMap={userColorMap}
          refreshLeaderboard={refreshLeaderboard}
          setTiles={setTiles}
        />
      </div>
      <div className="sidebar">
        {!user && <Register setUser={setUser} />}
        <Leaderboard data={leaderboard} />
      </div>
    </div>
  );
}