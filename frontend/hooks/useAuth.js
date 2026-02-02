import { useState } from "react";

export function useAuth() {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("pos_user"))
  );

  function login(userData) {
    setUser(userData);
    localStorage.setItem("pos_user", JSON.stringify(userData));
  }

  function logout() {
    // Log logout event
    if (user && user.username) {
      fetch("http://localhost:4000/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.username })
      });
    }

    setUser(null);
    localStorage.removeItem("pos_user");
  }

  return { user, login, logout };
}
