package service

import (
	"context"
	"grid-war/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type LeaderboardService struct {
	db *pgxpool.Pool
}

func NewLeaderboardService(db *pgxpool.Pool) *LeaderboardService {
	return &LeaderboardService{db: db}
}

func (s *LeaderboardService) GetLeaderboard(ctx context.Context) ([]models.LeaderboardEntry, error) {

	rows, err := s.db.Query(ctx, `
		SELECT u.id, u.name, u.color, COUNT(t.id) as count
		FROM tiles t
		JOIN users u ON t.owner_id = u.id
		GROUP BY u.id, u.name, u.color
		ORDER BY count DESC
	`)
	if err != nil {
		return nil, err
	}
	
	defer rows.Close()

	var results []models.LeaderboardEntry

	for rows.Next() {
		var entry models.LeaderboardEntry
		if err := rows.Scan(
			&entry.UserID,
			&entry.Name,
			&entry.Color,
			&entry.Count,
		); err != nil {
			return nil, err
		}

		results = append(results, entry)
	}

	return results, nil
}

// func (s *LeaderboardService) GetLeaderboard(ctx context.Context) ([]map[string]interface{}, error) {

// 	rows, err := s.db.Query(ctx, `
// 		SELECT owner_id, COUNT(*) as count
// 		FROM tiles
// 		WHERE owner_id IS NOT NULL
// 		GROUP BY owner_id
// 		ORDER BY count DESC
// 	`)
// 	if err != nil {
// 		return nil, err
// 	}
// 	defer rows.Close()

// 	var results []map[string]interface{}

// 	for rows.Next() {
// 		var ownerID string
// 		var count int
// 		rows.Scan(&ownerID, &count)

// 		results = append(results, map[string]interface{}{
// 			"userId": ownerID,
// 			"count":  count,
// 		})
// 	}

// 	return results, nil
// }