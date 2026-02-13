package handlers

import (
	"encoding/json"
	"net/http"

	"grid-war/internal/service"
)

func GetTilesHandler(svc *service.GameService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tiles, err := svc.GetAllTiles(r.Context())
		if err != nil {
			http.Error(w, "failed", 500)
			return
		}
		json.NewEncoder(w).Encode(tiles)
	}
}

func GetLeaderboardHandler(svc *service.LeaderboardService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		data, err := svc.GetLeaderboard(r.Context())
		if err != nil {
			http.Error(w, "failed", 500)
			return
		}
		json.NewEncoder(w).Encode(data)
	}
}