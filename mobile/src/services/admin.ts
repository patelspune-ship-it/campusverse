import { apiRequest } from "../api/client";
import type { AdminClub, AdminEvent, AdminStats, Event, EventStatus, PendingAdminEvent } from "../types/api";

export const getAdminStats = () => apiRequest<AdminStats>("/admin/stats");
export const getPendingEvents = () => apiRequest<PendingAdminEvent[]>("/admin/pending-events");
export const approveEvent = (id: string) => apiRequest<{ message: string; event: Event }>(`/admin/events/${id}/approve`, { method: "PATCH" });
export const rejectEvent = (id: string, rejection_reason: string) => apiRequest<{ message: string; event: Event }>(`/admin/events/${id}/reject`, { method: "PATCH", body: JSON.stringify({ rejection_reason }) });
export const getAllEvents = (status?: EventStatus) => apiRequest<AdminEvent[]>(`/admin/events${status ? `?status=${status}` : ""}`);
export const getAllClubs = () => apiRequest<AdminClub[]>("/admin/clubs");
