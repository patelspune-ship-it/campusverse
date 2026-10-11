import mongoose from "mongoose";

const venueSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true },
    code:         { type: String, default: null },
    institute_id: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    capacity:     { type: Number, required: true },

    venue_type: {
      type: String,
      enum: ["auditorium", "seminar_hall", "classroom", "lab", "open_ground", "sports_facility", "other"],
      required: true,
    },

    location:  { type: String, default: null },
    amenities: { type: [String], default: [] },

    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

venueSchema.index({ institute_id: 1, is_active: 1 });

export default mongoose.model("Venue", venueSchema);
