package service

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"grid-war/internal/models"
	"grid-war/internal/repository"
)

const (
	TOTAL_TILES      = 1000
	CAPTURE_COOLDOWN = 3 * time.Second  // per-user cooldown between captures
	RESET_DELAY      = 10 * time.Second // countdown before new game starts
)

type GameService struct {
	db    *pgxpool.Pool
	tiles repository.TileRepository
	rdb   *redis.Client

	// Per-user cooldown tracker
	cooldownMu  sync.Mutex
	lastCapture map[string]time.Time

	// Prevent multiple simultaneous game-over triggers
	gameOverMu    sync.Mutex
	gameOverFired bool
}

func NewGameService(db *pgxpool.Pool, tiles repository.TileRepository, rdb *redis.Client) *GameService {
	return &GameService{
		db:          db,
		tiles:       tiles,
		rdb:         rdb,
		lastCapture: make(map[string]time.Time),
	}
}

func (s *GameService) GetAllTiles(ctx context.Context) ([]models.Tile, error) {
	return s.tiles.GetAll(ctx)
}

// RemainingCooldown returns how many seconds remain on a user's cooldown (0 = ready)
func (s *GameService) RemainingCooldown(userID string) float64 {
	s.cooldownMu.Lock()
	defer s.cooldownMu.Unlock()
	last, ok := s.lastCapture[userID]
	if !ok {
		return 0
	}
	elapsed := time.Since(last)
	if elapsed >= CAPTURE_COOLDOWN {
		return 0
	}
	return (CAPTURE_COOLDOWN - elapsed).Seconds()
}
func (s *GameService) CaptureTile(ctx context.Context, tileID int, userID string) (*models.Tile, error) {
	// --- Start transaction ---
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// --- Capture tile ---
	tile, err := s.tiles.Capture(ctx, tx, tileID, userID)
	if err != nil {
		return nil, err
	}

	// --- Count remaining unclaimed tiles inside transaction ---
	var unclaimed int
	err = tx.QueryRow(
		ctx,
		`SELECT COUNT(*) FROM tiles WHERE owner_id IS NULL`,
	).Scan(&unclaimed)

	if err != nil {
		return nil, err
	}

	// --- Commit transaction ---
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	// --- Save cooldown timestamp ---
	s.cooldownMu.Lock()
	s.lastCapture[userID] = time.Now()
	s.cooldownMu.Unlock()

	// --- Publish tile update ---
	type TileUpdate struct {
		Type    string  `json:"type"`
		ID      int     `json:"id"`
		OwnerID *string `json:"ownerId"`
	}

	payload, err := json.Marshal(TileUpdate{
		Type:    "tile_update",
		ID:      tile.ID,
		OwnerID: tile.OwnerID,
	})

	if err == nil {
		s.rdb.Publish(ctx, "tile_updates", payload)
	}

	// --- Trigger game over check if all tiles filled ---
	if unclaimed == 0 {
		go func() {
			// Small delay prevents websocket race conditions
			time.Sleep(2 * time.Second)

			s.checkGameOver(context.Background())
		}()
	}

	return tile, nil
}

func (s *GameService) checkGameOver(ctx context.Context) {
	// Count unclaimed tiles
	var unclaimed int
	err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM tiles WHERE owner_id IS NULL`).Scan(&unclaimed)
	if err != nil || unclaimed > 0 {
		return
	}

	// Prevent duplicate triggers
	s.gameOverMu.Lock()
	if s.gameOverFired {
		s.gameOverMu.Unlock()
		return
	}
	s.gameOverFired = true
	s.gameOverMu.Unlock()

	// Build leaderboard
	rows, err := s.db.Query(ctx, `
		SELECT u.id, u.name, u.color, COUNT(t.id) as count
		FROM users u
		LEFT JOIN tiles t ON t.owner_id = u.id
		GROUP BY u.id
		ORDER BY count DESC
	`)
	if err != nil {
		log.Println("checkGameOver: leaderboard query failed:", err)
		return
	}
	defer rows.Close()

	type RankEntry struct {
		UserID string `json:"userId"`
		Name   string `json:"name"`
		Color  string `json:"color"`
		Count  int    `json:"count"`
		Rank   int    `json:"rank"`
	}

	var rankings []RankEntry
	rank := 1
	for rows.Next() {
		var e RankEntry
		if err := rows.Scan(&e.UserID, &e.Name, &e.Color, &e.Count); err != nil {
			continue
		}
		e.Rank = rank
		rank++
		rankings = append(rankings, e)
	}

	type GameOverMessage struct {
		Type     string      `json:"type"`
		Winner   RankEntry   `json:"winner"`
		Rankings []RankEntry `json:"rankings"`
		ResetIn  int         `json:"resetIn"` // seconds
	}

	var winner RankEntry
	if len(rankings) > 0 {
		winner = rankings[0]
	}

	msg := GameOverMessage{
		Type:     "game_over",
		Winner:   winner,
		Rankings: rankings,
		ResetIn:  int(RESET_DELAY.Seconds()),
	}

	payload, _ := json.Marshal(msg)
	s.rdb.Publish(ctx, "tile_updates", payload)

	// Wait then reset
	time.Sleep(RESET_DELAY)
	s.resetGame(context.Background())
}

func (s *GameService) resetGame(ctx context.Context) {
	// Clear all tile owners
	_, err := s.db.Exec(ctx, `UPDATE tiles SET owner_id = NULL, updated_at = NOW()`)
	if err != nil {
		log.Println("resetGame: failed to reset tiles:", err)
		return
	}

	// Reset cooldowns
	s.cooldownMu.Lock()
	s.lastCapture = make(map[string]time.Time)
	s.cooldownMu.Unlock()

	// Allow game over to fire again
	s.gameOverMu.Lock()
	s.gameOverFired = false
	s.gameOverMu.Unlock()

	// Broadcast new game started
	type NewGameMessage struct {
		Type string `json:"type"`
	}
	payload, _ := json.Marshal(NewGameMessage{Type: "new_game"})
	s.rdb.Publish(ctx, "tile_updates", payload)
}
