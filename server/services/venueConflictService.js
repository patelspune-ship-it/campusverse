import VenueBooking from "../models/VenueBooking.js";

// Parse "HH:MM" to total minutes from midnight
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Conflicts are a soft warning throughout this feature — this function
// only ever reports them, it never blocks a booking from being created.
//
// Interval overlap: existing.start < requested.end AND existing.end > requested.start
// Only "approved" bookings count as real conflicts — two pending requests
// for the same slot are expected (the whole point of admin review) and
// are not conflicts with each other.
export async function checkConflicts(venueId, date, startTime, endTime, excludeBookingId = null) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const filter = {
    venue_id: venueId,
    date:     { $gte: dayStart, $lt: dayEnd },
    status:   "approved",
  };
  if (excludeBookingId) filter._id = { $ne: excludeBookingId };

  const candidates = await VenueBooking.find(filter)
    .populate("club_id", "name")
    .populate("event_id", "name");

  const reqStart = toMinutes(startTime);
  const reqEnd   = toMinutes(endTime);

  return candidates
    .filter((b) => toMinutes(b.start_time) < reqEnd && toMinutes(b.end_time) > reqStart)
    .map((b) => ({
      _id:          b._id,
      title:        b.title,
      booking_type: b.booking_type,
      club_name:    b.club_id?.name ?? null,
      event_name:   b.event_id?.name ?? null,
      start_time:   b.start_time,
      end_time:     b.end_time,
    }));
}
