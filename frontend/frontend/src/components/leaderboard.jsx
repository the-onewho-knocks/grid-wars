export default function Leaderboard({ data }) {
  return (
    <div>
      <h3>Leaderboard</h3>
      {data.length === 0 && <p>No players yet</p>}
      {data.map((player) => (
        <div
          key={player.userId}
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span style={{ color: player.color }}>{player.name}</span>
          <span>{player.count}</span>
        </div>
      ))}
    </div>
  );
}