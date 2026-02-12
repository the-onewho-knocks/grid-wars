package realtime

type IncomingMessage struct {
	Type   string `json:"type"`
	TileID int    `json:"tileId,omitempty"`
	UserID string `json:"userId,omitempty"`
}

type TileUpdateMessage struct {
	Type    string  `json:"type"`
	TileID  int     `json:"tileId"`
	OwnerID *string `json:"ownerId"`
}