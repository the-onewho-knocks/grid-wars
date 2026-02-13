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
		PostgresURL: mustGetEnv("POSTGRES_URL"),
		RedisURL:    mustGetEnv("REDIS_URL"),
	}
}

func mustGetEnv(key string) string {
	val, ok := os.LookupEnv(key)
	if !ok {
		log.Fatalf("Missing required environment variable: %s", key)
	}
	return val
}
