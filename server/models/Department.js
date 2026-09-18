import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    institute_id: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

departmentSchema.index({ institute_id: 1, code: 1 }, { unique: true });

export default mongoose.model("Department", departmentSchema);
