package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"

	"grid-war/internal/cache"
	"grid-war/internal/config"
	"grid-war/internal/database"
	"grid-war/internal/handlers"
	"grid-war/internal/realtime"
	"grid-war/internal/repository"
	"grid-war/internal/service"
)

func main() {

	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Load configuration (must have env variables set)
	cfg := config.Load()

	// Connect to Postgres
	db, err := database.NewPostgres(cfg)
	if err != nil {
		log.Fatal("postgres connection failed:", err)
	}
	defer db.Close()

	// Connect to Redis
	rdb, err := cache.NewRedis(cfg)
	if err != nil {
		log.Fatal("redis connection failed:", err)
	}
	defer rdb.Close()

	// Initialize repositories
	tileRepo := repository.NewTileRepository(db)
	userRepo := repository.NewUserRepository(db)

	// Initialize services
	gameService := service.NewGameService(db, tileRepo, rdb)
	userService := service.NewUserService(userRepo)
	leaderboardService := service.NewLeaderboardService(db)

	_ = userService // remove later if unused

	// Initialize realtime hub
	hub := realtime.NewHub()
	go hub.Run()

	// Start Redis subscriber for distributed updates
	realtime.StartRedisSubscriber(context.Background(), rdb, hub)

	// Setup router
	r := chi.NewRouter()

	r.Get("/health", handlers.HealthHandler())
	r.Get("/tiles", handlers.GetTilesHandler(gameService))
	r.Get("/leaderboard", handlers.GetLeaderboardHandler(leaderboardService))
	r.Get("/ws", handlers.WSHandler(hub, gameService))

	// Create HTTP server
	server := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	// Start server
	go func() {
		log.Println("Server running on http://localhost:8080")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("server failed:", err)
		}
	}()

	// Graceful shutdown setup
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatal("server forced to shutdown:", err)
	}

	log.Println("Server exited properly")
}