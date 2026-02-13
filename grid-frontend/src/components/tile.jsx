import React from "react";

const Tile = React.memo(function Tile({ tile, onClick }) {
  return (
    <div
      className={`tile ${tile.ownerId ? "captured" : ""}`}
      style={{
        backgroundColor: tile.color || "rgba(255,255,255,0.15)",
      }}
      onClick={() => onClick(tile.id)}
    />
  );
});

export default Tile;