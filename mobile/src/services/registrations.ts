import { apiRequest } from "../api/client";
import type { AttendedEvent, RegisteredEvent } from "../types/api";
export const getMyRegistrations = () => apiRequest<RegisteredEvent[]>("/student/my-registrations");
export const getMyAttended = () => apiRequest<AttendedEvent[]>("/student/my-attended");
