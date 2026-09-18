import mongoose from "mongoose";

const divisionSchema = new mongoose.Schema(
  {
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },

    // Free-form by design — institutes name academic years differently
    // (FY/SY/TY, BTech1..BTech4, etc.), so this isn't a strict enum.
    year: { type: String, required: true },

    // Division number/label, e.g. "20", "A", "B"
    name: { type: String, required: true },

    academic_year: { type: String, required: true },

    // The single routing target for verified attendance in this division
    class_teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      default: null,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

divisionSchema.index(
  { department_id: 1, year: 1, name: 1, academic_year: 1 },
  { unique: true }
);

export default mongoose.model("Division", divisionSchema);
