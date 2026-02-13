import { useEffect, useRef } from "react";

export function useWebSocket(onTileUpdate) {
  const socketRef = useRef(null);

  useEffect(() => {
    const base = import.meta.env.VITE_BACKEND_URL;

    if (!base) {
      console.error("VITE_BACKEND_URL not set");
      return;
    }

    const wsBase = base.replace(/^https?:\/\//, "");
    const ws = new WebSocket(`wss://${wsBase}/ws`);

    socketRef.current = ws;

    ws.onopen = () => console.log("WebSocket connected");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "tile_update") {
        onTileUpdate(data);
      }

      if (data.type === "leaderboard_update") {
        window.dispatchEvent(
          new CustomEvent("leaderboard_update", { detail: data.leaders })
        );
      }
    };

    ws.onerror = (err) => console.error("WebSocket error", err);
    ws.onclose = () => console.warn("WebSocket closed");

    return () => ws.close();
  }, [onTileUpdate]);
}