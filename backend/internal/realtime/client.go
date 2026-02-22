package realtime

import (
	"log"
	"net/http"

	"grid-war/internal/service"

	"github.com/gorilla/websocket"
)

var Upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Client struct {
	hub     *Hub
	conn    *websocket.Conn
	send    chan []byte
	service *service.GameService
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
	log.Println("Client starting")
}

func (c *Client) readPump() {
	defer func() {
		c.hub.Unregister(c)
		c.conn.Close()
	}()

	log.Println("readPump started")
	for {
		var msg IncomingMessage
		if err := c.conn.ReadJSON(&msg); err != nil {
			log.Println("read error:", err)
			break
		}
	}
}

func (c *Client) writePump() {
	for msg := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			break
		}
	}
	log.Println("writePump done")
}
