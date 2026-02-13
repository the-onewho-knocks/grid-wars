import React from "react";
import Tile from "./Tile";

export default function Grid({ tilesMap, onTileClick, userColorMap }) {
  const tiles = Array.from(tilesMap.values());

  return (
    <div className="grid">
      {tiles.map((tile) => (
        <Tile
          key={tile.id}
          tile={tile}
          onClick={onTileClick}
          userColorMap={userColorMap}
        />
      ))}
    </div>
  );
}