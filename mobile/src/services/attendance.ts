import { apiRequest } from "../api/client";
import type { ScanResponse } from "../types/api";

export const scanEntry = (qr_token: string) => apiRequest<ScanResponse>("/attendance/entry", { method: "POST", body: JSON.stringify({ qr_token }) });
export const scanExit = (qr_token: string) => apiRequest<ScanResponse>("/attendance/exit", { method: "POST", body: JSON.stringify({ qr_token }) });
