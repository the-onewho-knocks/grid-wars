package main

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"

	"grid-war/internal/config"
	"grid-war/internal/database"
	"grid-war/internal/cache"
)

func main() {
	cfg := config.Load()

	db, err := database.NewPostgres(cfg)
	if err != nil {
		log.Fatal("failed to connect to postgres:", err)
	}
	defer db.Close()

	rdb, err := cache.NewRedis(cfg)
	if err != nil {
		log.Fatal("failed to connect to redis:", err)
	}
	defer rdb.Close()

	r := chi.NewRouter()

	// Handlers will be registered here later

	log.Println("Server running on :8080")
	http.ListenAndServe(":8080", r)
}