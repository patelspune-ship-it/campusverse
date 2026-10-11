import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    drive_id:   { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentDrive", required: true },
    // Denormalized for easier querying (club's own applications across all their drives)
    club_id:    { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    role_applied_for: { type: String, required: true },

    // Answers to the drive's questions at time of application
    responses: {
      type: [{
        question: { type: String, required: true },
        answer:   { type: String, default: "" },
      }],
      default: [],
    },

    stage: {
      type: String,
      enum: ["applied", "shortlisted", "interview_scheduled", "interviewed", "selected", "rejected"],
      default: "applied",
    },

    // Set when stage moves to "interview_scheduled"
    interview_slot: {
      date:         { type: Date,   default: null },
      time:         { type: String, default: null },
      venue:        { type: String, default: null },
      meeting_link: { type: String, default: null },
    },

    // Set when stage moves to "interviewed" — internal only, never shown to the student
    interview_feedback: {
      rating:      { type: Number, default: null },
      notes:       { type: String, default: null },
      recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      recorded_at: { type: Date,   default: null },
    },

    // Audit trail of every stage transition
    stage_history: {
      type: [{
        stage:      { type: String, required: true },
        changed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        changed_at: { type: Date, default: Date.now },
        note:       { type: String, default: null },
      }],
      default: [],
    },

    // Shown to the student on selection/rejection — distinct from the
    // internal interview_feedback/stage_history notes, which stay internal.
    final_remarks: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// One application per student per drive
applicationSchema.index({ drive_id: 1, student_id: 1 }, { unique: true });
applicationSchema.index({ club_id: 1, stage: 1 });

export default mongoose.model("Application", applicationSchema);
