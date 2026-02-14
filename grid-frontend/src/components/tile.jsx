export default function Tile({ tile, onClick, userColorMap }) {
  const ownerColor =
    tile.ownerId && userColorMap[tile.ownerId]
      ? userColorMap[tile.ownerId]
      : "#1e1e1e";

  return (
    <div
      className="tile"
      style={{
        backgroundColor: ownerColor,
        width: "25px",
        height: "25px",
        border: "1px solid #333",
        cursor: "pointer",
      }}
      onClick={() => onClick(tile.id)}
    />
  );
}