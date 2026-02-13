import { useEffect, useState } from "react";
import Grid from "./components/grid";
import Leaderboard from "./components/leaderboard";
import { fetchTiles, fetchLeaderboard, captureTile, registerUser } from "./api/api";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function App() {
  const [tilesMap, setTilesMap] = useState(new Map());
  const [leaderboard, setLeaderboard] = useState([]);
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ff0000");
  const [loading, setLoading] = useState(true);

  const userColorMap = leaderboard.reduce((acc, u) => {
    acc[u.userId] = u.color;
    return acc;
  }, {});

  useEffect(() => {
    async function init() {
      try {
        const [tilesData, leaderboardData] = await Promise.all([
          fetchTiles(),
          fetchLeaderboard(),
        ]);

        const map = new Map();
        (tilesData || []).forEach((tile) => {
          map.set(tile.id, tile);
        });

        setTilesMap(map);
        setLeaderboard(leaderboardData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  const refreshLeaderboard = async () => {
    try {
      const data = await fetchLeaderboard();
      setLeaderboard(data || []);
    } catch (err) {
      console.error("Leaderboard refresh failed");
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      alert("Enter a name");
      return;
    }

    const id = name.trim().toLowerCase();

    try {
      await registerUser({ id, name, color });
      setUser({ id, name, color });
      refreshLeaderboard();
    } catch (err) {
      alert("Registration failed");
    }
  };

  const handleTileClick = async (tileId) => {
    if (!user) {
      alert("Please register first.");
      return;
    }

    const existingTile = tilesMap.get(tileId);

    if (existingTile?.ownerId) {
      alert("⚠️ This tile is already collected!");
      return;
    }

    // Optimistic update
    setTilesMap((prev) => {
      const updated = new Map(prev);
      updated.set(tileId, {
        ...existingTile,
        ownerId: user.id,
      });
      return updated;
    });

    try {
      await captureTile({ tileId, userId: user.id });
      refreshLeaderboard();
    } catch (err) {
      // revert on failure
      setTilesMap((prev) => {
        const updated = new Map(prev);
        updated.set(tileId, existingTile);
        return updated;
      });

      alert("Capture failed.");
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="app-container">
      <div className="top-bar">
        {!user ? (
          <>
            <input
              type="text"
              placeholder="Enter name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
            <button onClick={handleRegister}>Join</button>
          </>
        ) : (
          <div className="logged-user">
            Playing as <span style={{ color }}>{user.name}</span>
          </div>
        )}
      </div>

      <div className="main-layout">
        <Grid
          tiles={[...tilesMap.values()]}
          onTileClick={handleTileClick}
          userColorMap={userColorMap}
        />
        <Leaderboard leaderboard={leaderboard} />
      </div>
    </div>
  );
}