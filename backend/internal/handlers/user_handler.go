package handlers

import (
	"encoding/json"
	"net/http"

	"grid-war/internal/models"
	"grid-war/internal/service"
)

type RegisterUserRequest struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

func RegisterUserHandler(svc *service.UserService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		var req RegisterUserRequest

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request", http.StatusBadRequest)
			return
		}

		user := models.User{
			ID:    req.ID,
			Name:  req.Name,
			Color: req.Color,
		}

		if err := svc.Register(r.Context(), user); err != nil {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}

		w.WriteHeader(http.StatusCreated)
	}
}