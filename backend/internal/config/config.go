package config

import "os"

type Config struct {
	PostgresURL string
	RedisURL    string
}

func Load() *Config {
	return &Config{
		PostgresURL: getEnv("POSTGRES_URL", "postgres://postgres:root@localhost:5432/grid-war?sslmode=disable"),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379"),
	}
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}