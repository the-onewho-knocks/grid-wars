const BASE_URL = "http://localhost:8080";

export async function fetchTiles() {
  const res = await fetch(`${BASE_URL}/tiles`);
  if (!res.ok) throw new Error("Failed to fetch tiles");
  return res.json();
}

export async function registerUser(data) {
  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Registration failed");
}

export async function captureTile(tileId, userId) {
  const res = await fetch(`${BASE_URL}/capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tileId, userId }),
  });

  if (res.status === 409) {
    throw new Error("Tile already claimed");
  }

  if (!res.ok) throw new Error("Capture failed");
  return res.json();
}

export async function fetchLeaderboard() {
  const res = await fetch(`${BASE_URL}/leaderboard`);
  if (!res.ok) throw new Error("Failed leaderboard");
  return res.json();
}