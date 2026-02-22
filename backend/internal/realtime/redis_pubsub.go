package realtime

import (
	"context"

	"github.com/redis/go-redis/v9"
)

func StartRedisSubscriber(ctx context.Context, rdb *redis.Client, hub *Hub) {
	pubsub := rdb.Subscribe(ctx, "tile_updates")
	ch := pubsub.Channel()

	go func() {
		for msg := range ch {
			hub.broadcast <- []byte(msg.Payload)
		}
	}()
}
