import { API_BASE_URL } from "./config";
import { clearSession, getToken } from "../services/sessionStorage";

export class ApiError extends Error { constructor(public readonly status: number, message: string, public readonly data?: any) { super(message); } }

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) { onUnauthorized = handler; }

// Render's free tier cold-starts a sleeping instance on the first request,
// which can take several seconds — 18s gives that room without hanging forever.
const REQUEST_TIMEOUT_MS = 18000;

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers); headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = await getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(0, "Request timed out. Please try again.");
    }
    throw new ApiError(0, "Could not reach CampusVerse. Check the API address and your network connection.");
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json().catch(() => ({}));
  if (response.status === 401) { await clearSession(); onUnauthorized?.(); }
  if (!response.ok) throw new ApiError(response.status, data.message || "Something went wrong. Please try again.", data);
  return data as T;
}
