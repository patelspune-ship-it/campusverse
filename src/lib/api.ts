export const API_URL = "http://localhost:5000"; // backend server

export async function apiRequest(path: string, method = "GET", body?: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  return res.json();
}
