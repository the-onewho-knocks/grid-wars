import Tile from "./tile";

export default function Grid({ tiles, onTileClick, userColorMap }) {
  return (
    <div className="grid-container">
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