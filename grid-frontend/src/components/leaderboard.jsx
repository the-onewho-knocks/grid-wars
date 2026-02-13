import React from "react";

export default function Leaderboard({ leaders }) {
  const safeLeaders = Array.isArray(leaders) ? leaders : [];

  return (
    <div className="leaderboard">
      <h2>🏆 Leaderboard</h2>

      {safeLeaders.length === 0 && (
        <p className="empty">No players yet.</p>
      )}

      {safeLeaders.map((player) => (
        <div key={player.userId} className="leader-row">
          <span
            className="color-dot"
            style={{ background: player.color }}
          />
          <span className="leader-name">{player.name}</span>
          <span className="leader-score">{player.count}</span>
        </div>
      ))}
    </div>
  );
}