import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema(
  {
    division_id:  { type: mongoose.Schema.Types.ObjectId, ref: "Division", required: true },
    day: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      required: true,
    },
    start_time:   { type: String, required: true },  // "HH:MM" 24-hour
    end_time:     { type: String, required: true },
    subject_name: { type: String, default: null },
    subject_code: { type: String, default: null },
    faculty_id:   { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", default: null },
    room_number:  { type: String, default: null },
    slot_type: {
      type: String,
      enum: ["lecture", "break", "lunch", "library", "online", "mentor_meeting", "mooc", "remedial"],
      required: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

timetableSchema.index({ division_id: 1, day: 1 });
timetableSchema.index({ faculty_id: 1, day: 1 });

export default mongoose.model("Timetable", timetableSchema);
