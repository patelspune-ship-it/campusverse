import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    name:             { type: String, required: true },
    description:      { type: String, required: true },
    date:             { type: Date,   required: true },
    start_time:       { type: String, required: true },
    end_time:         { type: String, required: true },
    venue:            { type: String, required: true },
    max_participants: { type: Number, required: true },
    registration_fee: { type: Number, default: 0 },
    poster_url:       { type: String, default: null },

    category: {
      type: String,
      enum: ["technical", "cultural", "sports", "other"],
      required: true,
    },

    club_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed", "cancelled"],
      default: "pending",
    },

    rejection_reason: { type: String, default: null },

    // Past-event fields (is_past_event = true means it was entered retroactively)
    is_past_event:               { type: Boolean, default: false },
    past_event_attendees_count:  { type: Number,  default: null },
    past_event_summary:          { type: String,  default: null },

    // Certificate generation tracking
    certificates_generated:    { type: Boolean, default: false },
    certificates_generated_at: { type: Date,    default: null  },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.model("Event", eventSchema);
