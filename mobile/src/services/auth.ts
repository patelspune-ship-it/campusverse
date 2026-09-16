import { apiRequest } from "../api/client";
import type { LoginResponse } from "../types/api";
export const login = (userId: string, password: string) => apiRequest<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify({ userId, password }) });
export { saveSession, restoreSession, clearSession } from "./sessionStorage";
