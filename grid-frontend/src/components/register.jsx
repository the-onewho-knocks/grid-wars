import { useState } from "react";
import { registerUser } from "../api/client";

export default function Register({ onRegistered }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ff4d6d");
  const [userId] = useState(() => crypto.randomUUID());

  async function handleSubmit(e) {
    e.preventDefault();
    await registerUser({ id: userId, name, color });
    onRegistered({ id: userId, name, color });
  }

  return (
    <form onSubmit={handleSubmit} className="register">
      <input
        placeholder="Enter name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
      />
      <button type="submit">Join</button>
    </form>
  );
}