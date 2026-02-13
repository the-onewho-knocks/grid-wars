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
			http.Error(w, "websocket upgrade failed", http.StatusBadRequest)
			return
		}

		client := realtime.NewClient(hub, conn, svc)
		client.Start()
	}
}