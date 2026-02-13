import { useCallback, useMemo } from "react";
import { captureTile } from "../api/api";
import Tile from "./Tile";

const TILE_IDS = Array.from({ length: 10000 }, (_, i) => i + 1);

export default function Grid({
  tiles,
  user,
  userColorMap,
  refreshLeaderboard,
  setTiles,
}) {
  const handleClick = useCallback(
    async (tileId) => {
      if (!user) return;

      // optimistic update
      setTiles((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(tileId);
        newMap.set(tileId, {
          ...existing,
          ownerId: user.id,
        });
        return newMap;
      });

      try {
        await captureTile(tileId, user.id);
        refreshLeaderboard();
      } catch (err) {
        console.error(err.message);
      }
    },
    [user, refreshLeaderboard, setTiles]
  );

  const tileElements = useMemo(() => {
    return TILE_IDS.map((id) => {
      const tile = tiles.get(id);
      const ownerId = tile?.ownerId;
      const color = ownerId ? userColorMap[ownerId] : undefined;

      return (
        <Tile
          key={id}
          id={id}
          ownerId={ownerId}
          color={color}
          onClick={handleClick}
        />
      );
    });
  }, [tiles, userColorMap, handleClick]);

  return <div className="grid">{tileElements}</div>;
}