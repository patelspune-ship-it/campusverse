import mongoose from "mongoose";

const facultySchema = new mongoose.Schema(
  {
    user_id:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    faculty_code:   { type: String, required: true, unique: true },
    full_name:      { type: String, required: true },
    institute_id:   { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    department:     { type: String, required: true },
    subjects_taught: [{ type: String }],

    // The single division this faculty is class teacher of, if any.
    // A faculty may be class teacher of at most one division (enforced below).
    is_class_teacher_of: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Division",
      default: null,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// A plain `sparse: true` index is NOT enough here: Mongoose applies
// `default: null` to unassigned faculty, so the field is explicitly
// present (value null) rather than missing — and MongoDB's sparse
// indexes only exclude documents where the field is genuinely absent,
// not documents where it's present-but-null. That means a sparse index
// would still collide on the second unassigned faculty. A partial index
// scoped to "the field is actually an ObjectId" correctly excludes both
// missing AND null values, so uniqueness is enforced only among faculty
// who are actually assigned as a class teacher.
facultySchema.index(
  { is_class_teacher_of: 1 },
  {
    unique: true,
    partialFilterExpression: { is_class_teacher_of: { $type: "objectId" } },
  }
);

export default mongoose.model("Faculty", facultySchema);
