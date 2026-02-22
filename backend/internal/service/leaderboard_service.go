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
	leaders := make([]models.LeaderboardEntry, 0)

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
		if err := rows.Scan(&l.UserID, &l.Name, &l.Color, &l.Count); err != nil {
			return leaders, err
		}
		leaders = append(leaders, l)
	}

	return leaders, nil
}
