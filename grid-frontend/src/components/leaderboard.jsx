import { useEffect, useState } from "react";
import { getLeaderboard } from "../api/client";

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    getLeaderboard()
      .then(setLeaders)
      .catch(console.error);
  }, []);

  return (
    <div className="leaderboard">
      <h2>Leaderboard</h2>
      {leaders.map((u) => (
        <div key={u.userId} style={{ color: u.color }}>
          {u.name} — {u.count}
        </div>
      ))}
    </div>
  );
}