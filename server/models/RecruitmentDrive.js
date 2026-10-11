import mongoose from "mongoose";

const recruitmentDriveSchema = new mongoose.Schema(
  {
    club_id: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },

    title:       { type: String, required: true },
    description: { type: String, default: null },
    roles_open:  { type: [String], default: [] },

    // Custom application questions the club defines for this drive.
    // Student answers map 1:1 into Application.responses.
    questions: {
      type: [{
        question: { type: String,  required: true },
        required: { type: Boolean, default: false },
      }],
      default: [],
    },

    application_deadline: { type: Date, required: true },

    status: {
      type: String,
      enum: ["draft", "open", "closed"],
      default: "draft",
    },

    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

recruitmentDriveSchema.index({ club_id: 1, status: 1 });

export default mongoose.model("RecruitmentDrive", recruitmentDriveSchema);
