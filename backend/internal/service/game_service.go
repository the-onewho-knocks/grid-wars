package service

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"grid-war/internal/models"
	"grid-war/internal/repository"
)

type GameService struct {
	db    *pgxpool.Pool
	tiles repository.TileRepository
	rdb   *redis.Client
}

func NewGameService(db *pgxpool.Pool, tiles repository.TileRepository, rdb *redis.Client) *GameService {
	return &GameService{
		db:    db,
		tiles: tiles,
		rdb:   rdb,
	}
}

//logic for capturing tile

func (s *GameService) CaptureTile(ctx context.Context,
tileID int , userID string)(*models.Tile , error){

	tx , err := s.db.Begin(ctx)
	if err != nil {
		return nil , err
	}

	defer tx.Rollback(ctx)

	tile , err := s.tiles.Capture(ctx , tx , tileID , userID)
	if err != nil {
		return nil , err
	}


	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	// Publish Redis event
	payload, _ := json.Marshal(tile)
	s.rdb.Publish(ctx, "tile_updates", payload)

	return tile, nil
}