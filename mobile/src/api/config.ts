// Defaults to the deployed CampusVerse backend. For local development,
// set EXPO_PUBLIC_API_BASE_URL in .env (e.g. http://10.0.2.2:5000/api for
// the Android emulator, or http://<your-LAN-IP>:5000/api for a physical device).
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "https://campusverse-s56y.onrender.com/api";

// The frontend SPA (student/club/faculty web app), deployed separately from the API.
export const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL?.replace(/\/$/, "") || "https://campusverse-nu.vercel.app";
