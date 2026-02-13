package models

import "time"

type Tile struct {
	ID        int       `json:"id"`
	OwnerID   *string   `json:"ownerId"`
	UpdatedAt time.Time `json:"updatedAt"`
}
