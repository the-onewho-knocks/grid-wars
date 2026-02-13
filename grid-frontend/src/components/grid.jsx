import React from "react";
import Tile from "./tile";

function Grid({ tilesMap, onTileClick }) {
  const tiles = Array.from(tilesMap.values()).slice(0, 1000);

  return (
    <div className="grid">
      {tiles.map((tile) => (
        <Tile
          key={tile.id}
          tile={tile}
          onClick={onTileClick}
        />
      ))}
    </div>
  );
}

export default React.memo(Grid);