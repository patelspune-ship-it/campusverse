import mongoose from "mongoose";

const instituteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true }, // e.g. SOE, SOCS
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

export default mongoose.model("Institute", instituteSchema);
