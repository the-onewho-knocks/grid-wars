package realtime

import (
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

var Upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func NewClient(hub *Hub, conn *websocket.Conn, svc *service.GameService) *Client {
	return &Client{
		hub:     hub,
		conn:    conn,
		send:    make(chan []byte, 256),
		service: svc,
	}
}

func (c *Client) Start() {
	c.hub.Register(c)
	go c.writePump()
	go c.readPump()
}
