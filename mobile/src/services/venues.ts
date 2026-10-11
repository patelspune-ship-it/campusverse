import { apiRequest } from "../api/client";
import type { Venue, VenueBooking, VenueConflict } from "../types/api";

// ── Club admin ──────────────────────────────────────────────
export const getVenues = () => apiRequest<Venue[]>("/club/venues");

export const getVenueAvailability = (venueId: string, date: string) =>
  apiRequest<VenueBooking[]>(`/club/venues/${venueId}/availability?date=${date}`);

export const getMyVenueBookings = () => apiRequest<VenueBooking[]>("/club/venue-bookings");

// ── Super admin ─────────────────────────────────────────────
export const getAdminVenues = () => apiRequest<Venue[]>("/admin/venues?is_active=true");

export const getAdminVenueBookings = (params: { date_from?: string; date_to?: string; venue_id?: string; status?: string }) => {
  const qs = new URLSearchParams();
  if (params.date_from) qs.set("date_from", params.date_from);
  if (params.date_to)   qs.set("date_to", params.date_to);
  if (params.venue_id)  qs.set("venue_id", params.venue_id);
  if (params.status)    qs.set("status", params.status);
  return apiRequest<VenueBooking[]>(`/admin/venue-bookings?${qs}`);
};

export const approveVenueBooking = (id: string) =>
  apiRequest<{ message: string; booking: VenueBooking; conflicts: VenueConflict[] }>(`/admin/venue-bookings/${id}/approve`, { method: "PATCH" });

export const rejectVenueBooking = (id: string, admin_remarks: string) =>
  apiRequest<{ message: string; booking: VenueBooking }>(`/admin/venue-bookings/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ admin_remarks }),
  });

export const cancelVenueBooking = (id: string) =>
  apiRequest<{ message: string; booking: VenueBooking }>(`/admin/venue-bookings/${id}/cancel`, { method: "PATCH" });
