import mongoose from "mongoose";

const venueBookingSchema = new mongoose.Schema(
  {
    venue_id: { type: mongoose.Schema.Types.ObjectId, ref: "Venue", required: true },

    booking_type: {
      type: String,
      enum: ["event", "block"],
      required: true,
    },

    // Required when booking_type is "event" — enforced in the route
    // layer (mirrors how BudgetRequest.event_id is validated), not here,
    // to match this codebase's existing convention of doing conditional
    // requiredness in the handler rather than a Mongoose validator.
    event_id: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },

    // Set for event bookings, and for admin pre-allocations held in a
    // club's name. Null for standalone admin blocks ("Maintenance", etc).
    club_id: { type: mongoose.Schema.Types.ObjectId, ref: "Club", default: null },

    title: { type: String, required: true },

    // Matches Event.js's exact convention: Date for the day, free "HH:MM"
    // strings for start/end.
    date:       { type: Date,   required: true },
    start_time: { type: String, required: true },
    end_time:   { type: String, required: true },

    // Club-requested bookings start "pending"; admin-created ones start
    // "approved" immediately (set explicitly by the route, not this default).
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },

    created_by:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    admin_remarks: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

venueBookingSchema.index({ venue_id: 1, date: 1, status: 1 });

export default mongoose.model("VenueBooking", venueBookingSchema);
