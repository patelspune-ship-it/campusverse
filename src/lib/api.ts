export const API_URL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000`;

console.log("Campus Verse API_URL =", API_URL);
console.log("VITE_API_URL env =", import.meta.env.VITE_API_URL);

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
