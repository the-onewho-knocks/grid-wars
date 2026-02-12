package models

import "time"

type Tile struct {
	ID        int
	OwnerID   *string
	UpdatedAt time.Time
}