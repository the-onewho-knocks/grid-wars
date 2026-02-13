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

	leaders := make([]models.LeaderboardEntry, 0) // NEVER nil

	rows, err := s.db.Query(ctx, `
		SELECT u.id, u.name, u.color, COUNT(t.id) as count
		FROM users u
		LEFT JOIN tiles t ON t.owner_id = u.id
		GROUP BY u.id
		ORDER BY count DESC
	`)
	if err != nil {
		return leaders, err
	}
	defer rows.Close()

	for rows.Next() {
		var l models.LeaderboardEntry
		err := rows.Scan(&l.UserID, &l.Name, &l.Color, &l.Count)
		if err != nil {
			return leaders, err
		}
		leaders = append(leaders, l)
	}

	return leaders, nil
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
