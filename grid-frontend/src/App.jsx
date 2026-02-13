import React, { useEffect, useState, useCallback } from "react";
import { getTiles, getLeaderboard, registerUser, captureTile } from "./api/client";
import { useWebSocket } from "./hooks/useWebSocket";
import Grid from "./components/grid";
import Leaderboard from "./components/leaderboard";

export default function App() {
  const [tilesMap, setTilesMap] = useState(new Map());
  const [leaders, setLeaders] = useState([]);
  const [userColorMap, setUserColorMap] = useState({});
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ================= INITIAL LOAD =================
  useEffect(() => {
    async function load() {
      try {
        const [tilesData, leaderboardData] = await Promise.all([
          getTiles(),
          getLeaderboard(),
        ]);

        // Build tile map
        const map = new Map();
        (tilesData || []).forEach((tile) => {
          map.set(tile.id, tile);
        });
        setTilesMap(map);

        // Leaderboard + color map
        const safeLeaders = leaderboardData || [];
        setLeaders(safeLeaders);

        const colorMap = {};
        safeLeaders.forEach((player) => {
          colorMap[player.userId] = player.color;
        });
        setUserColorMap(colorMap);

      } catch (err) {
        console.error("Initial load failed:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // ================= TILE UPDATE =================
  const handleTileUpdate = useCallback((data) => {
    if (!data || !data.tileId) return;

    setTilesMap((prev) => {
      const updated = new Map(prev);
      const existing = updated.get(data.tileId);

      if (existing) {
        updated.set(data.tileId, {
          ...existing,
          ownerId: data.ownerId,
        });
      }

      return updated;
    });

    refreshLeaderboard();
  }, []);

  useWebSocket(handleTileUpdate);

  // ================= LEADERBOARD REFRESH =================
  const refreshLeaderboard = async () => {
    try {
      const data = await getLeaderboard();
      const safeData = data || [];

      setLeaders(safeData);

      const map = {};
      safeData.forEach((player) => {
        map[player.userId] = player.color;
      });

      setUserColorMap(map);
    } catch (err) {
      console.error("Leaderboard refresh failed:", err);
    }
  };

  // ================= REGISTER =================
  const handleRegister = async (name, color) => {
    try {
      const id = crypto.randomUUID();

      await registerUser({
        id,
        name,
        color,
      });

      setUser({ id, name, color });
      refreshLeaderboard();
    } catch {
      alert("Registration failed");
    }
  };

  // ================= TILE CLICK =================
  const handleTileClick = async (tileId) => {
    if (!user) {
      alert("Please register first.");
      return;
    }

    try {
      await captureTile({
        tileId,
        userId: user.id,
      });
    } catch (err) {
      if (err.message === "Tile already claimed") {
        alert("⚠️ This tile is already collected!");
      } else {
        alert("Capture failed.");
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading grid...</div>;
  }

  return (
    <div className="app-container">
      <div className="main">
        <Grid
          tilesMap={tilesMap}
          onTileClick={handleTileClick}
          userColorMap={userColorMap}
        />
      </div>

      <div className="sidebar">
        {!user && (
          <RegisterPanel onRegister={handleRegister} />
        )}
        <Leaderboard leaders={leaders} />
      </div>
    </div>
  );
}


// ================= REGISTER PANEL =================
function RegisterPanel({ onRegister }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ff0000");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Enter your name");
      return;
    }
    onRegister(name, color);
  };

  return (
    <form className="register-panel" onSubmit={handleSubmit}>
      <h2>Join the Game</h2>

      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
      />

      <button type="submit">Join</button>
    </form>
  );
}