import mongoose from "mongoose";

const divisionSchema = new mongoose.Schema(
  {
    institute_id: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    department:   { type: String, required: true },
    year:         { type: String, enum: ["FY", "SY", "TY", "BTech"], required: true },
    division_code: { type: String, required: true },
    semester:     { type: Number, required: true },
    academic_year: { type: String, required: true },
    class_teacher_faculty_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      default: null,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

divisionSchema.index({ institute_id: 1, division_code: 1 }, { unique: true });

export default mongoose.model("Division", divisionSchema);
