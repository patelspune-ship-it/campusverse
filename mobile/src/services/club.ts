import { apiRequest } from "../api/client";
import type { ClubEvent, CreateEventPayload, Event, EventAttendeesResponse, ScannerEvent } from "../types/api";

export const getClubEvents = () => apiRequest<ClubEvent[]>("/club/events");
export const getScannerEvents = () => apiRequest<ScannerEvent[]>("/club/events/scanner-list");
export const getEventAttendees = (eventId: string) => apiRequest<EventAttendeesResponse>(`/club/events/${eventId}/attendees`);
export const createEvent = (payload: CreateEventPayload) => apiRequest<{ message: string; event: Event }>("/club/events", { method: "POST", body: JSON.stringify(payload) });
