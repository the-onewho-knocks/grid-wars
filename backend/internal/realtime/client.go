package realtime

import (
	"encoding/json"
	"net/http"

	"grid-war/internal/service"

	"github.com/gorilla/websocket"
)

type Client struct {
	hub     *Hub
	conn    *websocket.Conn
	send    chan []byte
	service *service.GameService
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	for {
		var msg IncomingMessage
		if err := c.conn.ReadJSON(&msg); err != nil {
			break
		}

		if msg.Type == "capture" {
			tile, err := c.service.CaptureTile(
				c.conn.Context(),
				msg.TileID,
				msg.UserID,
			)

			if err != nil {
				continue
			}

			update := TileUpdateMessage{
				Type:    "tile_update",
				TileID:  tile.ID,
				OwnerID: tile.OwnerID,
			}

			bytes, _ := json.Marshal(update)
			c.hub.broadcast <- bytes
		}
	}
}

func (c *Client) writePump() {
	for message := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
			return
		}
	}
}
