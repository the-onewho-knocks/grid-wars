import { useEffect, useRef } from "react";

export function useWebSocket(onTileUpdate) {
  const socketRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080/ws");
    socketRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "tile_update") {
        onTileUpdate(data);
      }
    };

    ws.onerror = () => {
      console.error("WebSocket error");
    };

    return () => {
      ws.close();
    };
  }, [onTileUpdate]);
}