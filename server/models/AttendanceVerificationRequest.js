import mongoose from "mongoose";

const avrSchema = new mongoose.Schema(
  {
    student_id:       { type: mongoose.Schema.Types.ObjectId, ref: "User",         required: true },
    faculty_id:       { type: mongoose.Schema.Types.ObjectId, ref: "Faculty",      required: true },
    event_id:         { type: mongoose.Schema.Types.ObjectId, ref: "Event",        required: true },
    registration_id:  { type: mongoose.Schema.Types.ObjectId, ref: "Registration", required: true },
    timetable_slot_id: { type: mongoose.Schema.Types.ObjectId, ref: "Timetable",   required: true },

    // Denormalized for fast display (no join needed on faculty dashboard)
    lecture_date:       { type: Date,   required: true },
    lecture_start_time: { type: String, required: true },
    lecture_end_time:   { type: String, required: true },
    subject_name:       { type: String, required: true },
    event_name:         { type: String, required: true },
    event_entry_time:   { type: Date,   default: null },
    event_exit_time:    { type: Date,   default: null },
    event_duration_minutes: { type: Number, default: null },
    certificate_id:     { type: String, default: null },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    faculty_action_at:  { type: Date,   default: null },
    rejection_reason:   { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

avrSchema.index({ faculty_id: 1, status: 1 });
avrSchema.index({ student_id: 1, event_id: 1 });
// Prevent duplicate requests for the same student+event+slot combo
avrSchema.index({ student_id: 1, event_id: 1, timetable_slot_id: 1 }, { unique: true });

export default mongoose.model("AttendanceVerificationRequest", avrSchema);
