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
  institute_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Institute",
    default: null,
  },

  // For club_admin: which club they manage
  club_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Club",
    default: null,
  },

  // true = user must change their password on next login (e.g. seeded club admins)
  must_change_password: { type: Boolean, default: false },

  // Student profile fields (filled during self-signup)
  name:       { type: String, default: null },
  department: { type: String, default: null },
  year:       { type: String, default: null }, // "1" – "5"

  // true = user has completed their profile setup
  profile_completed: { type: Boolean, default: false },
});

export default mongoose.model("User", userSchema);
