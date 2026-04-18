import { useState } from "react";
import { API_URL as BASE_URL } from "../lib/api";

const API_URL = `${BASE_URL}/api/auth`;

interface RegisterPayload {
  userId: string;
  email: string;
  mobile?: string;
  password: string;
  name?: string;
  department?: string;
  year?: string;
  institute_id?: string | null;
}

export function useAuth() {
  const [loading, setLoading] = useState(false);

  const login = async ({ userId, password }: { userId: string; password: string }) => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      localStorage.setItem("cv_token", data.token);
      localStorage.setItem("cv_user",  JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/register`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Auto-login: backend returns token + user on successful student signup
      if (data.token) {
        localStorage.setItem("cv_token", data.token);
        localStorage.setItem("cv_user",  JSON.stringify(data.user));
      }
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
