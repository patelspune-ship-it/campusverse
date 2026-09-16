import { apiRequest } from "../api/client";
import type { Event, Registration, StudentStats } from "../types/api";
export const getUpcomingEvents = () => apiRequest<Event[]>("/public/events/upcoming");
export const getStudentStats = () => apiRequest<StudentStats>("/student/stats");
export const checkIsRegistered = (eventId: string) => apiRequest<{ isRegistered: boolean }>(`/events/${eventId}/is-registered`);
export const registerForEvent = (eventId: string) => apiRequest<{ message: string; registration: Registration }>(`/events/${eventId}/register`, { method: "POST" });
