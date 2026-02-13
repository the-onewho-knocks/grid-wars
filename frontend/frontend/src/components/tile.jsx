import { memo } from "react";

function Tile({ id, ownerId, color, onClick }) {
  return (
    <div
      className="tile"
      onClick={() => onClick(id)}
      style={{ backgroundColor: color || "#0f172a" }}
    />
  );
}

export default memo(Tile);