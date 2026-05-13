package service

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"grid-war/internal/models"
	"grid-war/internal/repository"
)

const (
	TOTAL_TILES      = 1000
	CAPTURE_COOLDOWN = 2 * time.Second  // per-user cooldown between captures
	RESET_DELAY      = 20 * time.Second // countdown before new game starts
	STEAL_THRESHOLD  = 5                // unclaimed tiles claimed per steal slot (5→1, 10→2, 15→3, …)
)

var (
	ErrAlreadyOwned      = errors.New("you already own this tile")
	ErrNotEnoughTiles    = errors.New("you need at least 5 claimed tiles to steal an occupied tile")
	ErrStealLimitReached = errors.New("you have used all your steal slots; claim more unclaimed tiles to unlock more")
)

// stealAllowance returns how many steals a user is permitted based on
// how many unclaimed tiles they have ever claimed this game.
// Formula: floor(claimedCount / STEAL_THRESHOLD)
// Examples: 0–4 → 0, 5–9 → 1, 10–14 → 2, 15–19 → 3, …
func stealAllowance(claimedCount int) int {
	return claimedCount / STEAL_THRESHOLD
}

type GameService struct {
	db    *pgxpool.Pool
	tiles repository.TileRepository
	rdb   *redis.Client

	// Per-user cooldown tracker
	cooldownMu  sync.Mutex
	lastCapture map[string]time.Time

	// Progressive steal tracking (both reset each game).
	stealMu      sync.Mutex
	claimedCount map[string]int // unclaimed→owned captures this game
	stolenCount  map[string]int // steals used this game

	// Prevent multiple simultaneous game-over triggers
	gameOverMu    sync.Mutex
	gameOverFired bool
}

func NewGameService(db *pgxpool.Pool, tiles repository.TileRepository, rdb *redis.Client) *GameService {
	return &GameService{
		db:           db,
		tiles:        tiles,
		rdb:          rdb,
		lastCapture:  make(map[string]time.Time),
		claimedCount: make(map[string]int),
		stolenCount:  make(map[string]int),
	}
}

func (s *GameService) GetAllTiles(ctx context.Context) ([]models.Tile, error) {
	return s.tiles.GetAll(ctx)
}

// RemainingCooldown returns how many seconds remain on a user's cooldown (0 = ready).
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

// OwnedTileCount returns how many tiles the given user currently owns.
func (s *GameService) OwnedTileCount(ctx context.Context, userID string) (int, error) {
	var count int
	err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM tiles WHERE owner_id = $1`, userID).Scan(&count)
	return count, err
}

// StealStatus returns a snapshot of a user's progressive steal state:
// how many unclaimed tiles they've claimed, their current steal allowance,
// and how many steal slots they've consumed so far this game.
func (s *GameService) StealStatus(userID string) (claimed, allowance, used int) {
	s.stealMu.Lock()
	defer s.stealMu.Unlock()
	claimed = s.claimedCount[userID]
	used = s.stolenCount[userID]
	allowance = stealAllowance(claimed)
	return
}

func (s *GameService) CaptureTile(ctx context.Context, tileID int, userID string) (*models.Tile, error) {
	// --- Start transaction ---
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// --- Lock the target tile row and read its current owner ---
	// FOR UPDATE prevents two concurrent requests from racing on the same tile.
	var currentOwnerID *string
	err = tx.QueryRow(
		ctx,
		`SELECT owner_id FROM tiles WHERE id = $1 FOR UPDATE`,
		tileID,
	).Scan(&currentOwnerID)
	if err != nil {
		return nil, err
	}

	var tile *models.Tile

	switch {
	// Case 1: tile is unclaimed → normal capture
	case currentOwnerID == nil:
		tile, err = s.tiles.Capture(ctx, tx, tileID, userID)
		if err != nil {
			return nil, err
		}

	// Case 2: user already owns this tile → reject
	case *currentOwnerID == userID:
		return nil, ErrAlreadyOwned

	// Case 3: tile belongs to someone else → steal if user qualifies
	default:
		// Read both counters under a single lock for a consistent view.
		s.stealMu.Lock()
		claimed := s.claimedCount[userID]
		stolen := s.stolenCount[userID]
		s.stealMu.Unlock()

		allowance := stealAllowance(claimed)

		if allowance == 0 {
			// User hasn't claimed enough unclaimed tiles yet.
			return nil, ErrNotEnoughTiles
		}
		if stolen >= allowance {
			return nil, ErrStealLimitReached
		}

		// Perform the steal.
		tile, err = s.stealTile(ctx, tx, tileID, userID)
		if err != nil {
			return nil, err
		}
	}

	// --- Count remaining unclaimed tiles inside transaction ---
	// Steals don't change the unclaimed count, but we check uniformly
	// to handle any edge case.
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

	// --- Update progressive steal counters ---
	s.stealMu.Lock()
	if currentOwnerID == nil {
		// Normal capture of an unclaimed tile: advances steal allowance.
		s.claimedCount[userID]++
	} else {
		// Steal of an occupied tile: consumes a steal slot.
		s.stolenCount[userID]++
	}
	s.stealMu.Unlock()

	// --- Publish tile update (covers both normal captures and steals) ---
	type TileUpdate struct {
		Type          string  `json:"type"`
		ID            int     `json:"id"`
		OwnerID       *string `json:"ownerId"`
		PreviousOwner *string `json:"previousOwner,omitempty"` // non-nil on steals so the UI can react
		Stolen        bool    `json:"stolen"`
	}

	update := TileUpdate{
		Type:    "tile_update",
		ID:      tile.ID,
		OwnerID: tile.OwnerID,
		Stolen:  currentOwnerID != nil,
	}
	if currentOwnerID != nil {
		update.PreviousOwner = currentOwnerID
	}

	payload, err := json.Marshal(update)
	if err == nil {
		s.rdb.Publish(ctx, "tile_updates", payload)
	}

	// --- Trigger game-over check if all tiles are now claimed ---
	if unclaimed == 0 {
		go func() {
			defer func() {
				if r := recover(); r != nil {
					log.Println("checkGameOver: panic recovered:", r)
					s.gameOverMu.Lock()
					s.gameOverFired = false
					s.gameOverMu.Unlock()
				}
			}()
			time.Sleep(2 * time.Second)
			s.checkGameOver(context.Background())
		}()
	}

	return tile, nil
}

// stealTile transfers ownership of an already-claimed tile to newOwnerID
// and returns the updated tile model. Must be called within a transaction.
func (s *GameService) stealTile(ctx context.Context, tx pgx.Tx, tileID int, newOwnerID string) (*models.Tile, error) {
	tile := &models.Tile{}
	err := tx.QueryRow(
		ctx,
		`UPDATE tiles
		 SET owner_id  = $1,
		     updated_at = NOW()
		 WHERE id = $2
		 RETURNING id, owner_id, updated_at`,
		newOwnerID,
		tileID,
	).Scan(&tile.ID, &tile.OwnerID, &tile.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return tile, nil
}

func (s *GameService) checkGameOver(ctx context.Context) {
	var unclaimed int
	err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM tiles WHERE owner_id IS NULL`).Scan(&unclaimed)
	if err != nil || unclaimed > 0 {
		return
	}

	s.gameOverMu.Lock()
	if s.gameOverFired {
		s.gameOverMu.Unlock()
		return
	}
	s.gameOverFired = true
	s.gameOverMu.Unlock()

	rows, err := s.db.Query(ctx, `
		SELECT u.id, u.name, u.color, COUNT(t.id) as count
		FROM users u
		LEFT JOIN tiles t ON t.owner_id = u.id
		GROUP BY u.id
		ORDER BY count DESC
	`)
	if err != nil {
		log.Println("checkGameOver: leaderboard query failed:", err)
		s.gameOverMu.Lock()
		s.gameOverFired = false
		s.gameOverMu.Unlock()
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
		ResetIn  int         `json:"resetIn"`
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

	time.Sleep(RESET_DELAY)
	s.resetGame(context.Background())
}

func (s *GameService) resetGame(ctx context.Context) {
	defer func() {
		s.gameOverMu.Lock()
		s.gameOverFired = false
		s.gameOverMu.Unlock()
	}()

	_, err := s.db.Exec(ctx, `UPDATE tiles SET owner_id = NULL, updated_at = NOW()`)
	if err != nil {
		log.Println("resetGame: failed to reset tiles:", err)
		return
	}

	s.cooldownMu.Lock()
	s.lastCapture = make(map[string]time.Time)
	s.cooldownMu.Unlock()

	// Reset progressive steal state for the new game.
	s.stealMu.Lock()
	s.claimedCount = make(map[string]int)
	s.stolenCount = make(map[string]int)
	s.stealMu.Unlock()

	// Remove all users
	_, err = s.db.Exec(ctx, `DELETE FROM users`)
	if err != nil {
		log.Println("resetGame: failed to clear users:", err)
	}

	if err != nil {
		log.Println("resetGame: failed to remove inactive users:", err)
	}

	s.broadcastTileResets(ctx)

	type NewGameMessage struct {
		Type string `json:"type"`
	}
	payload, _ := json.Marshal(NewGameMessage{Type: "new_game"})
	s.rdb.Publish(ctx, "tile_updates", payload)
}

func (s *GameService) broadcastTileResets(ctx context.Context) {
	rows, err := s.db.Query(ctx, `SELECT id FROM tiles`)
	if err != nil {
		log.Println("broadcastTileResets: query failed:", err)
		return
	}
	defer rows.Close()

	type TileUpdate struct {
		Type    string  `json:"type"`
		ID      int     `json:"id"`
		OwnerID *string `json:"ownerId"`
	}

	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			continue
		}
		payload, err := json.Marshal(TileUpdate{
			Type:    "tile_update",
			ID:      id,
			OwnerID: nil,
		})
		if err != nil {
			continue
		}
		if err := s.rdb.Publish(ctx, "tile_updates", payload).Err(); err != nil {
			log.Println("broadcastTileResets: publish failed for tile", id, ":", err)
		}
	}
}
