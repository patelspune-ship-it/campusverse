import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
  {
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
    event_id:   { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    attended:           { type: Boolean, default: false },
    attended_at:        { type: Date,    default: null  },
    qr_code_path:       { type: String,  default: null  },
    qr_token:           { type: String,  default: null  },
    certificate_path:   { type: String,  default: null  },
  },
  { timestamps: { createdAt: "registered_at", updatedAt: false } }
);

registrationSchema.index({ student_id: 1, event_id: 1 }, { unique: true });

export default mongoose.model("Registration", registrationSchema);
