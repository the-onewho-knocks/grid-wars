import React from "react";

const Tile = React.memo(function Tile({ tile, onClick }) {
  return (
    <div
      className="tile"
      style={{
        backgroundColor: tile.color || "rgba(255,255,255,0.05)",
      }}
      onClick={() => onClick(tile.id)}
    />
  );
});

export default Tile;