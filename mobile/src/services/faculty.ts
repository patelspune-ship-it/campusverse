import { apiRequest } from "../api/client";
import type { VerificationRequest, VerificationStatus } from "../types/api";

export const getVerifications = (status: VerificationStatus) => apiRequest<VerificationRequest[]>(`/faculty/verifications?status=${status}`);
export const approveVerification = (id: string) => apiRequest<{ message: string; avr: VerificationRequest }>(`/faculty/verifications/${id}/approve`, { method: "PATCH" });
export const rejectVerification = (id: string, reason: string) => apiRequest<{ message: string; avr: VerificationRequest }>(`/faculty/verifications/${id}/reject`, { method: "PATCH", body: JSON.stringify({ reason }) });
