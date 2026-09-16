import mongoose from "mongoose";

const clubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },

    // null = university-wide club (not tied to a single institute)
    institute_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      default: null,
    },

    // Filled by club admin after first login
    category: {
      type: String,
      enum: ["technical", "cultural", "sports", "social", "arts", "other", null],
      default: null,
    },
    description:    { type: String, default: null },
    logo_url:       { type: String, default: null },
    banner_url:     { type: String, default: null },
    instagram_handle: { type: String, default: null },
    linkedin_url:   { type: String, default: null },
    club_email:     { type: String, default: null },
    founded_year:   { type: Number, default: null },

    // Becomes true only when club admin has filled all required profile fields
    profile_completed: { type: Boolean, default: false },

    // Rich profile fields — seeded for featured clubs, optional for all others
    core_team:            { type: [{ name: String, role: String }], default: [] },
    recruitment_open:     { type: Boolean, default: false },
    recruitment_contact:  { type: String,  default: null },
    recruitment_message:  { type: String,  default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.model("Club", clubSchema);
