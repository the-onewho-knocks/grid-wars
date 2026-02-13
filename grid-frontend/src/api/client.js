const BASE_URL = import.meta.env.VITE_BACKEND_URL;

if (!BASE_URL) {
  console.error("VITE_BACKEND_URL not set");
}

export async function getTiles() {
  const res = await fetch(`${BASE_URL}/tiles`);
  if (!res.ok) throw new Error("Failed to fetch tiles");
  const data = await res.json();
  return data || [];
}

export async function getLeaderboard() {
  const res = await fetch(`${BASE_URL}/leaderboard`);
  if (!res.ok) throw new Error("Failed leaderboard fetch");
  const data = await res.json();
  return data || [];
}

export async function registerUser(payload) {
  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Registration failed");
}

export async function captureTile(payload) {
  const res = await fetch(`${BASE_URL}/capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.status === 409) throw new Error("Tile already claimed");
  if (!res.ok) throw new Error("Capture failed");

  return res.json();
}