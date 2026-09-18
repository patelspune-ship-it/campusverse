import mongoose from "mongoose";

const avrSchema = new mongoose.Schema(
  {
    student_id:      { type: mongoose.Schema.Types.ObjectId, ref: "User",         required: true },
    // Class teacher this request was routed to (snapshot at routing time)
    faculty_id:      { type: mongoose.Schema.Types.ObjectId, ref: "Faculty",      required: true },
    division_id:     { type: mongoose.Schema.Types.ObjectId, ref: "Division",     required: true },
    event_id:        { type: mongoose.Schema.Types.ObjectId, ref: "Event",        required: true },
    registration_id: { type: mongoose.Schema.Types.ObjectId, ref: "Registration", required: true },

    // Denormalized for fast display (no join needed on faculty dashboard)
    event_name:             { type: String, required: true },
    event_date:             { type: Date,   default: null },
    event_entry_time:       { type: Date,   default: null },
    event_exit_time:        { type: Date,   default: null },
    event_duration_minutes: { type: Number, default: null },
    certificate_id:         { type: String, default: null },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    faculty_action_at: { type: Date,   default: null },
    rejection_reason:  { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

avrSchema.index({ faculty_id: 1, status: 1 });
// Idempotent + one request per student per event, since routing now targets
// a single class teacher instead of N overlapping timetable slots.
avrSchema.index({ student_id: 1, event_id: 1 }, { unique: true });

export default mongoose.model("AttendanceVerificationRequest", avrSchema);
