// Vite dev server proxies /api → http://localhost:5000 internally.
// So API calls use the same origin as the page — no hardcoded port needed.
// https://192.168.29.150:8080/api/... → proxy → http://localhost:5000/api/...
export const API_URL = window.location.origin;

/** JSON requests — automatically attaches Bearer token */
export async function apiRequest(path: string, method = "GET", body?: any) {
  const token = localStorage.getItem("cv_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return res.json();
}

/**
 * FormData requests (file uploads) — attaches Bearer token but does NOT
 * set Content-Type so the browser can add the multipart boundary itself.
 */
export async function apiFormData(
  path: string,
  method: string,
  formData: FormData
) {
  const token = localStorage.getItem("cv_token");

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: formData,
  });

  return res.json();
}
