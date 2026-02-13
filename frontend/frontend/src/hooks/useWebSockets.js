import { useEffect } from "react";

export default function useWebSocket(user, onMessage) {
  useEffect(() => {
    if (!user) return;

    const ws = new WebSocket("ws://localhost:8080/ws");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error("Invalid WS message");
      }
    };

    ws.onerror = () => {
      console.error("WebSocket error");
    };

    return () => {
      ws.close();
    };
  }, [user, onMessage]);
}