import React, { useState } from "react";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    if (e) e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }

    fetch("http://localhost:4000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username,
        password: password
      })
    })
      .then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(onLogin)
      .catch(() => setError("Invalid login"));
  }

  return (
    <div className="flex flex-col" style={{ height: "100vh" }}>
      <div className="flex justify-center items-center" style={{ flex: 1 }}>
        <form onSubmit={submit} className="glass-card flex flex-col gap-4 align-center" style={{ width: 320 }}>
          <h2>🔐 POS Login</h2>

          <div className="w-full">
            <input
              className="w-full"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          <div className="w-full">
            <input
              className="w-full"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-bubble w-full">
            Login
          </button>

          {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
        </form>
      </div>
      <div className="text-center pb-2 opacity-30 select-none" style={{ fontSize: "10px", color: "#94a3b8" }}>
        Copyrights <a href="http://www.ctrlplustech.com" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }} onMouseOver={(e) => e.target.style.textDecoration = "underline"} onMouseOut={(e) => e.target.style.textDecoration = "none"}>CtrlPlusTech</a>
      </div>
    </div>
  );
}
