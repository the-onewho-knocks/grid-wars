import React from "react";

export default function Tile({ tile, onClick, userColorMap }) {
  const ownerColor =
    tile.ownerId && userColorMap[tile.ownerId]
      ? userColorMap[tile.ownerId]
      : "#1e1e1e";

  return (
    <div
      className="tile"
      style={{ backgroundColor: ownerColor }}
      onClick={() => onClick(tile.id)}
    />
  );
}