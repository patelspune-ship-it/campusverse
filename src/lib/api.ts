export const API_URL = "http://localhost:5000"; // backend server

export async function apiRequest(path: string, method = "GET", body?: any) {
  const token = localStorage.getItem("cv_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return res.json();
}
