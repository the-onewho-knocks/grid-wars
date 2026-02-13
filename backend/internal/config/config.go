package config

import (
	"log"
	"os"
)

type Config struct {
	PostgresURL string
	RedisURL    string
}

func Load() *Config {
	return &Config{
		PostgresURL: getEnvWithFallback("POSTGRES_URL", "DATABASE_URL"),
		RedisURL:    mustGetEnv("REDIS_URL"),
	}
}

func getEnvWithFallback(primary, fallback string) string {
	val := os.Getenv(primary)
	if val != "" {
		return val
	}

	val = os.Getenv(fallback)
	if val != "" {
		return val
	}

	log.Fatalf("Missing required environment variable: %s or %s", primary, fallback)
	return ""
}

func mustGetEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		log.Fatalf("Missing required environment variable: %s", key)
	}
	return val
}