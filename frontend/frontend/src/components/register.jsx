import { useState } from "react";
import { registerUser } from "../api/api";

export default function Register({ setUser }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ff0000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const id = name.toLowerCase().replace(/\s+/g, "_");

    try {
      setLoading(true);
      await registerUser({ id, name, color });
      setUser({ id, name, color });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Register</h3>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <button disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}