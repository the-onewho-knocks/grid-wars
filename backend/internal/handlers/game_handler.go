package handlers

import (
	"encoding/json"
	"net/http"

	"grid-war/internal/models"
	"grid-war/internal/service"
)

type CaptureRequest struct {
	TileID int    `json:"tileId"`
	UserID string `json:"userId"`
}

// func GetTilesHandler(svc *service.GameService) http.HandlerFunc {
// 	return func(w http.ResponseWriter, r *http.Request) {
// 		tiles, err := svc.GetAllTiles(r.Context())
// 		if err != nil {
// 			http.Error(w, "failed", 500)
// 			return
// 		}
// 		json.NewEncoder(w).Encode(tiles)
// 	}
// }

func GetTilesHandler(svc *service.GameService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		tiles, err := svc.GetAllTiles(ctx)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if tiles == nil {
			tiles = make([]models.Tile, 0)
		}

		w.Header().Set("Content-Type", "application/json")
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

func CaptureTileHandler(svc *service.GameService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		var req CaptureRequest

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request", http.StatusBadRequest)
			return
		}

		tile, err := svc.CaptureTile(r.Context(), req.TileID, req.UserID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}

		json.NewEncoder(w).Encode(tile)
	}
}