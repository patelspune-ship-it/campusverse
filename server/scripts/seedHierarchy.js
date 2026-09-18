// Wipes and re-seeds the class-teacher routing hierarchy:
// Institute (existing) → Department → Division → Faculty (class teachers).
// Pre-launch test data only — safe to re-run any time.
// Run with: node scripts/seedHierarchy.js
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Institute from "../models/Institute.js";
import Department from "../models/Department.js";
import Division  from "../models/Division.js";
import Faculty   from "../models/Faculty.js";
import User      from "../models/User.js";
import AttendanceVerificationRequest from "../models/AttendanceVerificationRequest.js";

await mongoose.connect(process.env.MONGO_URI, { dbName: "CampusVerseDB" });
console.log("✅ Connected\n");

// ── 1. Clean slate ───────────────────────────────────────────
console.log("── Wiping existing hierarchy collections ──────────");
for (const name of ["divisions", "faculties", "timetables", "attendanceverificationrequests"]) {
  try {
    await mongoose.connection.db.collection(name).drop();
    console.log(`  🗑️  Dropped collection: ${name}`);
  } catch (err) {
    if (err.codeName === "NamespaceNotFound") {
      console.log(`  ℹ️  Collection ${name} did not exist, skipping`);
    } else {
      throw err;
    }
  }
}

// Rebuild indexes from the CURRENT schema definitions. Dropping a
// collection also drops whatever indexes existed on it, but that alone
// doesn't guarantee the freshly recreated collection gets indexes
// matching the schema in code right now — Mongoose's own autoIndex pass
// runs once in the background per model/connection and can race with
// (or predate) the drops above. syncIndexes() explicitly drops any index
// that doesn't match the current schema and creates any that are
// missing, so this is correct whether the index was already fixed,
// still stale from an older schema version, or the collection is brand
// new. This is what actually closes the
// "stale non-sparse is_class_teacher_of index" gap.
for (const Model of [Division, Faculty, AttendanceVerificationRequest]) {
  const droppedIndexes = await Model.syncIndexes();
  console.log(
    `  🔧 Synced ${Model.modelName} indexes` +
    (droppedIndexes.length ? ` (dropped stale: ${droppedIndexes.join(", ")})` : " (already up to date)")
  );
}

// Faculty User accounts are tied 1:1 to Faculty docs we just wiped —
// remove them too so re-seeding doesn't collide on email/userId.
const facultyUsersDeleted = await User.deleteMany({ role: "faculty" });
console.log(`  🗑️  Removed ${facultyUsersDeleted.deletedCount} existing faculty User account(s)`);

// Student division_id values now point at deleted divisions — clear them
// so no student carries a dangling reference. Re-assign after this run.
const staleRefs = await User.updateMany(
  { role: "student", division_id: { $ne: null } },
  { $set: { division_id: null } }
);
console.log(`  ℹ️  Cleared stale division_id on ${staleRefs.modifiedCount} student account(s)\n`);

// ── 2. Institute ──────────────────────────────────────────────
const institute = await Institute.findOne({
  $or: [{ code: "SOC" }, { code: "SOCS" }, { name: /computing/i }],
});
if (!institute) {
  console.error("❌ Could not find MIT School of Computing. Available institutes:");
  const all = await Institute.find().select("name code");
  all.forEach((i) => console.log(`  ${i.code} — ${i.name}`));
  await mongoose.disconnect();
  process.exit(1);
}
console.log(`✅ Institute: ${institute.name} (${institute._id})\n`);

// ── 3. Departments ───────────────────────────────────────────
const DEPARTMENTS_SEED = [
  { name: "Computer Science & Engineering",       code: "CSE"   },
  { name: "Information Technology",               code: "IT"    },
  { name: "Artificial Intelligence & Data Science", code: "AI&DS" },
];

console.log("── Departments ─────────────────────────────────────");
// Departments are NOT wiped above (only Division/Faculty/Timetable/AVR
// are) — they can carry over from a previous run, including a partial
// one that died mid-way. Find-or-create so re-running never collides on
// the {institute_id, code} unique index.
const deptMap = {}; // code → Department _id
for (const d of DEPARTMENTS_SEED) {
  let dept = await Department.findOne({ institute_id: institute._id, code: d.code });
  if (!dept) {
    dept = await Department.create({ name: d.name, code: d.code, institute_id: institute._id });
    console.log(`  ✅ Created: ${d.name} (${d.code})`);
  } else {
    console.log(`  ℹ️  Already exists: ${d.name} (${d.code})`);
  }
  deptMap[d.code] = dept._id;
}

// ── 4. Faculty ───────────────────────────────────────────────
const FACULTY_SEED = [
  { code: "PMY", name: "Prof. P. M. Yadav",     dept: "CSE" },
  { code: "SG",  name: "Prof. S. Ghokhale",     dept: "CSE" },
  { code: "AU",  name: "Prof. A. Upadhyay",     dept: "CSE" },
  { code: "HRM", name: "Prof. H. Mulaye",       dept: "CSE" },
  { code: "MB",  name: "Prof. Dr. M. Bhosale",  dept: "IT"  },
  { code: "AP",  name: "Prof. A. Pimpalgaonkar", dept: "AI&DS" },
];

console.log("\n── Faculty ──────────────────────────────────────────");
const hashedPw = await bcrypt.hash("Faculty@123", 10);
const facultyMap = {}; // code → Faculty _id

for (const f of FACULTY_SEED) {
  const email = `${f.code.toLowerCase()}@campusverse.in`;

  const user = await User.create({
    userId:               email,
    email,
    password:             hashedPw,
    role:                 "faculty",
    name:                 f.name,
    institute_id:         institute._id,
    must_change_password: true,
    profile_completed:    true,
  });
  // Write role explicitly (workaround for Mongoose default not persisting)
  await mongoose.connection.db.collection("users").updateOne(
    { _id: user._id }, { $set: { role: "faculty" } }
  );

  const facultyDoc = await Faculty.create({
    user_id:      user._id,
    faculty_code: f.code,
    full_name:    f.name,
    institute_id: institute._id,
    department:   DEPARTMENTS_SEED.find((d) => d.code === f.dept).name,
  });
  await User.findByIdAndUpdate(user._id, { faculty_id: facultyDoc._id });

  facultyMap[f.code] = facultyDoc._id;
  console.log(`  ✅ ${f.name} (${f.code}) — login: ${email} / Faculty@123`);
}

// ── 5. Divisions + class teacher assignment ──────────────────
const DIVISIONS_SEED = [
  { dept: "CSE", year: "SY", name: "20", academic_year: "2025-26", classTeacher: "PMY" },
  { dept: "CSE", year: "SY", name: "21", academic_year: "2025-26", classTeacher: "SG"  },
  { dept: "CSE", year: "TY", name: "30", academic_year: "2025-26", classTeacher: "AU"  },
];

console.log("\n── Divisions ────────────────────────────────────────");
for (const d of DIVISIONS_SEED) {
  const division = await Division.create({
    department_id:    deptMap[d.dept],
    year:              d.year,
    name:              d.name,
    academic_year:     d.academic_year,
    class_teacher_id:  facultyMap[d.classTeacher],
  });
  await Faculty.findByIdAndUpdate(facultyMap[d.classTeacher], { is_class_teacher_of: division._id });
  const teacherName = FACULTY_SEED.find((f) => f.code === d.classTeacher).name;
  console.log(`  ✅ ${d.year} ${d.dept} Div ${d.name} — class teacher: ${teacherName} (${d.classTeacher})`);
}

// ── Summary ───────────────────────────────────────────────────
console.log("\n═══════════════════════════════════════════════════");
console.log(`Seeded ${DEPARTMENTS_SEED.length} departments, ${FACULTY_SEED.length} faculty, ${DIVISIONS_SEED.length} divisions`);
console.log("═══════════════════════════════════════════════════");

console.log("\nFaculty login credentials (all password: Faculty@123):");
FACULTY_SEED.forEach((f) => {
  console.log(`  ${f.code.padEnd(5)} ${f.name.padEnd(28)} ${f.code.toLowerCase()}@campusverse.in`);
});

console.log("\nClass teachers (routing targets):");
DIVISIONS_SEED.forEach((d) => {
  const teacherName = FACULTY_SEED.find((f) => f.code === d.classTeacher).name;
  console.log(`  ${d.year} ${d.dept} Div ${d.name}  →  ${teacherName}`);
});

if (staleRefs.modifiedCount > 0) {
  console.log(`\n⚠️  ${staleRefs.modifiedCount} student account(s) had their division_id cleared`);
  console.log("   (it pointed at a division wiped by this script) — they'll need to be");
  console.log("   reassigned to one of the newly seeded divisions above.");
}

await mongoose.disconnect();
console.log("\n✅ Done.");
