package repository

import (
	"context"
	"errors"

	"grid-war/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TileRepository interface {
	GetAll(ctx context.Context) ([]models.Tile, error)
	Capture(ctx context.Context, tx pgx.Tx, tileID int, userID string) (*models.Tile, error)
}

type tileRepo struct{
	db *pgxpool.Pool
}

func NewTileRepository(db *pgxpool.Pool) TileRepository{
	return &tileRepo{db:db}
}

func(r *tileRepo) GetAll(ctx context.Context)([]models.Tile , error){
	rows , err := r.db.Query(ctx , `
		select id , owner_id , updated_at from tiles
	`)
	if err != nil{
		return nil , err
	}

	defer rows.Close()

	var tiles []models.Tile

	for rows.Next(){
		var t models.Tile
		if err := rows.Scan(&t.ID , &t.OwnerID , &t.UpdatedAt);err!= nil {
			return nil , err
		}
		tiles = append(tiles, t)
	}

	return tiles , nil
}

func (r *tileRepo) Capture(
	ctx context.Context,
	tx pgx.Tx,
	tileID int,
	userID string,
) (*models.Tile, error) {

	var tile models.Tile

	err := tx.QueryRow(ctx, `
		select id, owner_id, updated_at
		from tiles
		where id = $1
		for update
	`, tileID).Scan(&tile.ID, &tile.OwnerID, &tile.UpdatedAt)

	if err != nil {
		return nil, err
	}

	if tile.OwnerID != nil {
		return nil, errors.New("tile already claimed")
	}

	_, err = tx.Exec(ctx, `
		update tiles
		set owner_id = $1, updated_at = now()
		where id = $2
	`, userID, tileID)

	if err != nil {
		return nil, err
	}

	tile.OwnerID = &userID

	return &tile, nil
}