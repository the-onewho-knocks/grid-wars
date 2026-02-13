import { useEffect, useState } from "react";
import { getLeaderboard } from "../api/client";

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await getLeaderboard();
      setLeaders(data);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="leaderboard">
      <h3>Leaderboard</h3>
      {leaders.map((u) => (
        <div key={u.userId} style={{ color: u.color }}>
          {u.name} — {u.count}
        </div>
      ))}
    </div>
  );
}