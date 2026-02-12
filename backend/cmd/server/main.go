package main

import (
	"context"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"

	"grid-war/internal/cache"
	"grid-war/internal/config"
	"grid-war/internal/database"
	"grid-war/internal/handlers"
	"grid-war/internal/realtime"
	"grid-war/internal/repository"
	"grid-war/internal/service"
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
	hub := realtime.NewHub()
	go hub.Run()

	tileRepo := repository.NewTileRepository(db)
	gameService := service.NewGameService(db, tileRepo, rdb)

	realtime.StartRedisSubscriber(context.Background(), rdb, hub)

	r.Get("/ws", handlers.WSHandler(hub, gameService))

	r := chi.NewRouter()

	// Handlers will be registered here later

	log.Println("Server running on :8080")
	http.ListenAndServe(":8080", r)
}
