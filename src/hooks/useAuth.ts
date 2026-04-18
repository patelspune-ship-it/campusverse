import { useState } from "react";

const API_URL = "http://localhost:5000/api/auth";

export function useAuth() {
  const [loading, setLoading] = useState(false);

  // ✅ LOGIN USING USER ID + PASSWORD
  const login = async ({ userId, password }) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      localStorage.setItem("cv_token", data.token);
      localStorage.setItem("cv_user", JSON.stringify(data.user));

      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // ✅ REGISTER USER
  const register = async ({ userId, email, mobile, password, role }) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email, mobile, password, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("cv_token");
    localStorage.removeItem("cv_user");
    window.location.reload();
  };

  return { login, register, logout, loading };
}
