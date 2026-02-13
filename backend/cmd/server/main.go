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
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
	"github.com/jackc/pgx/v5/pgxpool"

	"grid-war/internal/cache"
	"grid-war/internal/config"
	"grid-war/internal/database"
	"grid-war/internal/handlers"
	"grid-war/internal/realtime"
	"grid-war/internal/repository"
	"grid-war/internal/service"
)

func main() {

	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	cfg := config.Load()

	// Connect Postgres
	db, err := database.NewPostgres(cfg)
	if err != nil {
		log.Fatal("postgres connection failed:", err)
	}
	defer db.Close()

	// Run migrations
	runMigrations(db)

	// Connect Redis
	rdb, err := cache.NewRedis(cfg)
	if err != nil {
		log.Fatal("redis connection failed:", err)
	}
	defer rdb.Close()

	// Repositories
	tileRepo := repository.NewTileRepository(db)
	userRepo := repository.NewUserRepository(db)

	// Services
	gameService := service.NewGameService(db, tileRepo, rdb)
	userService := service.NewUserService(userRepo)
	leaderboardService := service.NewLeaderboardService(db)

	// Realtime hub
	hub := realtime.NewHub()
	go hub.Run()

	realtime.StartRedisSubscriber(context.Background(), rdb, hub)

	// Router
	r := chi.NewRouter()

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{
			"http://localhost:5173",
			"https://unrivaled-khapse-1c17af.netlify.app",
		},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge: 300,
	}))

	r.Get("/health", handlers.HealthHandler())
	r.Get("/tiles", handlers.GetTilesHandler(gameService))
	r.Post("/capture", handlers.CaptureTileHandler(gameService))
	r.Get("/leaderboard", handlers.GetLeaderboardHandler(leaderboardService))
	r.Get("/ws", handlers.WSHandler(hub, gameService))
	r.Post("/register", handlers.RegisterUserHandler(userService))

	server := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	go func() {
		log.Println("Server running on port 8080")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("server failed:", err)
		}
	}()

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

func runMigrations(db *pgxpool.Pool) {
	ctx := context.Background()

	_, err := db.Exec(ctx, `
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		color TEXT NOT NULL
	);
	`)
	if err != nil {
		log.Fatal("Failed creating users table:", err)
	}

	_, err = db.Exec(ctx, `
	CREATE TABLE IF NOT EXISTS tiles (
		id SERIAL PRIMARY KEY,
		owner_id TEXT,
		updated_at TIMESTAMP DEFAULT NOW()
	);
	`)
	if err != nil {
		log.Fatal("Failed creating tiles table:", err)
	}

	var count int
	err = db.QueryRow(ctx, `SELECT COUNT(*) FROM tiles`).Scan(&count)
	if err != nil {
		log.Fatal("Failed counting tiles:", err)
	}

	if count == 0 {
		log.Println("Seeding 1000 tiles...")
		_, err = db.Exec(ctx, `
			INSERT INTO tiles (id)
			SELECT generate_series(1,1000);
		`)
		if err != nil {
			log.Fatal("Failed seeding tiles:", err)
		}
	}
}