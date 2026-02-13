export default function Leaderboard({ leaderboard }) {
  return (
    <div className="leaderboard">
      <h2>Leaderboard</h2>
      {leaderboard.length === 0 && <p>No players yet</p>}

      {leaderboard.map((user) => (
        <div key={user.userId} className="leader-row">
          <span style={{ color: user.color }}>{user.name}</span>
          <span>{user.count}</span>
        </div>
      ))}
    </div>
  );
}