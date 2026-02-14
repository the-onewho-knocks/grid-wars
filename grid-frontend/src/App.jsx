import { useEffect, useState } from "react";

import Grid from "./components/grid";
import Leaderboard from "./components/leaderboard";

import {
  fetchTiles,
  fetchLeaderboard,
  captureTile,
  registerUser,
} from "./api/client";

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

        tilesData.forEach((tile) => {
          map.set(tile.id, tile);
        });

        setTilesMap(map);
        setLeaderboard(leaderboardData);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  async function handleRegister() {
    const id = name.toLowerCase();

    await registerUser({
      id,
      name,
      color,
    });

    setUser({ id, name, color });

    const lb = await fetchLeaderboard();
    setLeaderboard(lb);
  }

  async function handleTileClick(tileId) {

    if (!user) {
      alert("Register first");
      return;
    }

    const existingTile = tilesMap.get(tileId);

    if (existingTile.ownerId) {
      alert("Already owned");
      return;
    }

    const updated = new Map(tilesMap);

    updated.set(tileId, {
      ...existingTile,
      ownerId: user.id,
    });

    setTilesMap(updated);

    await captureTile({
      tileId,
      userId: user.id,
    });

    const lb = await fetchLeaderboard();
    setLeaderboard(lb);
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>

      {!user && (
        <div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="name"
          />

          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />

          <button onClick={handleRegister}>
            Join
          </button>
        </div>
      )}

      {user && (
        <div>
          Playing as
          <span style={{ color: user.color }}>
            {" "}
            {user.name}
          </span>
        </div>
      )}

      <Grid
        tiles={[...tilesMap.values()]}
        onTileClick={handleTileClick}
        userColorMap={userColorMap}
      />

      <Leaderboard leaderboard={leaderboard} />

    </div>
  );
}