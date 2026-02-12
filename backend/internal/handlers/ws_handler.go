package handlers

import (
	"net/http"

	"grid-war/internal/realtime"
	"grid-war/internal/service"
)

func WSHandler(hub *realtime.Hub, svc *service.GameService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := realtime.Upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		client := &realtime.Client{
			hub:     hub,
			conn:    conn,
			send:    make(chan []byte, 256),
			service: svc,
		}

		hub.register <- client

		go client.writePump()
		go client.readPump()
	}
}
