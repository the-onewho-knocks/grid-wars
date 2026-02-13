import React from "react";
import Tile from "./tile";

function Grid({ tilesMap, onTileClick }) {
  const tiles = Array.from(tilesMap.values());

  console.log("Rendering tiles count:", tiles.length);

  return (
    <div className="grid">
      {tiles.map((tile, index) => (
        <Tile
          key={tile?.id ?? index}
          tile={tile}
          onClick={onTileClick}
        />
      ))}
    </div>
  );
}

export default React.memo(Grid);