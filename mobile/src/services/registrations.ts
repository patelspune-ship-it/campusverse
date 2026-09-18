import { apiRequest } from "../api/client";
import type { AttendedEvent, RegisteredEvent, StudentDivisionInfo } from "../types/api";
export const getMyRegistrations = () => apiRequest<RegisteredEvent[]>("/student/my-registrations");
export const getMyAttended = () => apiRequest<AttendedEvent[]>("/student/my-attended");
export const getMyDivision = () => apiRequest<StudentDivisionInfo>("/student/my-division");
