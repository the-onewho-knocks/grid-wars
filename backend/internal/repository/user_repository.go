package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"grid-war/internal/models"
)

type UserRepository interface {
	Create(ctx context.Context, user models.User) error
	GetByID(ctx context.Context, id string) (*models.User, error)
}

type userRepo struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) UserRepository {
	return &userRepo{db: db}
}

func (r *userRepo) Create(ctx context.Context, user models.User) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO users (id, name, color) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
		user.ID, user.Name, user.Color,
	)
	return err
}

func (r *userRepo) GetByID(ctx context.Context, id string) (*models.User, error) {
	var user models.User
	err := r.db.QueryRow(ctx,
		`SELECT id, name, color FROM users WHERE id = $1`, id,
	).Scan(&user.ID, &user.Name, &user.Color)
	if err != nil {
		return nil, err
	}
	return &user, nil
}
