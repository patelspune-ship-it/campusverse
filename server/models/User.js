import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  // For students: their PRN. For faculty/club_admin/super_admin: their email.
  userId: { type: String, unique: true, required: true },
  email: String,
  mobile: String,
  password: String,
  role: {
    type: String,
    enum: ["student", "club_admin", "faculty", "super_admin"],
    default: "student",
  },
  // Nullable for super_admin; links user to one of the 18 institutes
  institute_id: { type: String, default: null },
});

export default mongoose.model("User", userSchema);
