grid-war/
│
├── cmd/
│   └── server/
│       └── main.go
│
├── internal/
│   ├── config/
│   │   └── config.go
│   │
│   ├── database/
│   │   ├── postgres.go
│   │   └── migrations/
│   │
│   ├── cache/
│   │   └── redis.go
│   │
│   ├── models/
│   │   ├── tile.go
│   │   ├── user.go
│   │   └── leaderboard.go
│   │
│   ├── repository/
│   │   ├── tile_repository.go
│   │   └── user_repository.go
│   │
│   ├── service/
│   │   ├── game_service.go
│   │   ├── user_service.go
│   │   └── leaderboard_service.go
│   │
│   ├── realtime/
│   │   ├── hub.go
│   │   ├── client.go
│   │   ├── redis_pubsub.go
│   │   └── messages.go
│   │
│   ├── handlers/
│   │   ├── ws_handler.go
│   │   ├── game_handler.go
│   │   └── health_handler.go
│   │
│   └── utils/
│       └── id.go
│
├── go.mod
└── go.sum