import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
  {
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
    event_id:   { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },

    entry_scanned:     { type: Boolean, default: false },
    entry_scanned_at:  { type: Date,    default: null  },
    exit_scanned:      { type: Boolean, default: false },
    exit_scanned_at:   { type: Date,    default: null  },
    attendance_status: {
      type:    String,
      enum:    ["not_attended", "partial", "full"],
      default: "not_attended",
    },
    duration_minutes:  { type: Number,  default: null  },

    qr_code_path:      { type: String,  default: null  },
    qr_token:          { type: String,  default: null  },
    certificate_path:           { type: String, default: null },
    certificate_id:             { type: String, default: null },
    certificate_generated_at:   { type: Date,   default: null },
  },
  { timestamps: { createdAt: "registered_at", updatedAt: false } }
);

registrationSchema.index({ student_id: 1, event_id: 1 }, { unique: true });

export default mongoose.model("Registration", registrationSchema);
