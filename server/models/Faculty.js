import mongoose from "mongoose";

const facultySchema = new mongoose.Schema(
  {
    user_id:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    faculty_code:   { type: String, required: true, unique: true },
    full_name:      { type: String, required: true },
    institute_id:   { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    department:     { type: String, required: true },
    subjects_taught: [{ type: String }],
    is_class_teacher: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.model("Faculty", facultySchema);
