// Seed: Division + Faculty + Timetable for SY 20 (CSE, MIT School of Computing)
// Run with: node scripts/seedTimetable.js
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Institute from "../models/Institute.js";
import Division  from "../models/Division.js";
import Faculty   from "../models/Faculty.js";
import User      from "../models/User.js";
import Timetable from "../models/Timetable.js";

await mongoose.connect(process.env.MONGO_URI, { dbName: "CampusVerseDB" });
console.log("✅ Connected\n");

// ── 1. Find institute ────────────────────────────────────────
const institute = await Institute.findOne({
  $or: [{ code: "SOC" }, { code: "SOCS" }, { name: /computing/i }],
});
if (!institute) {
  console.error("❌ Could not find MIT School of Computing. Available institutes:");
  const all = await Institute.find().select("name code");
  all.forEach((i) => console.log(`  ${i.code} — ${i.name}`));
  process.exit(1);
}
console.log(`✅ Institute: ${institute.name} (${institute._id})\n`);

// ── 2. Upsert Division ───────────────────────────────────────
let division = await Division.findOne({
  institute_id: institute._id,
  division_code: "SY 20",
});
if (!division) {
  division = await Division.create({
    institute_id:  institute._id,
    department:    "Computer Science & Engineering",
    year:          "SY",
    division_code: "SY 20",
    semester:      4,
    academic_year: "2025-26",
  });
  console.log(`✅ Created division: ${division.division_code} (${division._id})`);
} else {
  console.log(`ℹ️  Division already exists: ${division.division_code} (${division._id})`);
}

// ── 3. Faculty seed data ─────────────────────────────────────
const FACULTY_SEED = [
  { code: "PMY",  name: "Prof. P. M. Yadav",          subjects: ["Operating System"],                           isClassTeacher: true  },
  { code: "SG",   name: "Prof. S. Ghokhale",           subjects: ["Mathematical Foundation for Computing III"],  isClassTeacher: false },
  { code: "AU",   name: "Prof. A. Upadhyay",           subjects: ["Computer Networks"],                         isClassTeacher: false },
  { code: "HRM",  name: "Prof. H. Mulaye",             subjects: ["Environmental Studies"],                     isClassTeacher: false },
  { code: "MB",   name: "Prof. Dr. M. Bhosale",        subjects: ["Theory of Computation"],                     isClassTeacher: false },
  { code: "AP",   name: "Prof. A. Pimpalgaonkar",      subjects: ["Foundations of Artificial Intelligence"],    isClassTeacher: false },
  { code: "APC",  name: "Prof. A. Chitale",            subjects: ["Foundations of Cloud Computing"],            isClassTeacher: false },
  { code: "RBS",  name: "Prof. R. Sangave",            subjects: ["Cyber Security Essentials"],                 isClassTeacher: false },
];

const hashedPw = await bcrypt.hash("Faculty@123", 10);
const facultyMap = {}; // code → Faculty doc _id

let newFaculty = 0;
for (const f of FACULTY_SEED) {
  const email = `${f.code.toLowerCase()}@campusverse.in`;

  // Find or create User
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
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
  }

  // Find or create Faculty doc
  let facultyDoc = await Faculty.findOne({ faculty_code: f.code });
  if (!facultyDoc) {
    facultyDoc = await Faculty.create({
      user_id:          user._id,
      faculty_code:     f.code,
      full_name:        f.name,
      institute_id:     institute._id,
      department:       "Computer Science & Engineering",
      subjects_taught:  f.subjects,
      is_class_teacher: f.isClassTeacher,
    });
    // Link faculty_id on User
    await User.findByIdAndUpdate(user._id, { faculty_id: facultyDoc._id });
    newFaculty++;
    console.log(`  ✅ Created faculty: ${f.name} (${f.code}) — login: ${email} / Faculty@123`);
  } else {
    console.log(`  ℹ️  Faculty already exists: ${f.name} (${f.code})`);
  }

  facultyMap[f.code] = facultyDoc._id;
}
console.log(`\n✅ Faculty: ${newFaculty} new, ${FACULTY_SEED.length - newFaculty} existing\n`);

// Update division class teacher
if (!division.class_teacher_faculty_id) {
  await Division.findByIdAndUpdate(division._id, {
    class_teacher_faculty_id: facultyMap["PMY"],
  });
}

// ── 4. Timetable entries ─────────────────────────────────────
// slot format: [day, start, end, subject, subjectCode, facultyCode, room]
const LECTURES = [
  // MONDAY
  ["Monday", "10:50", "11:45", "Mathematical Foundation for Computing III", "MFC-III", "SG",  "S519"],
  ["Monday", "11:45", "12:40", "Computer Networks",                        "CN",      "AU",  "S519"],

  // TUESDAY
  ["Tuesday", "08:45", "09:40", "Operating System",                        "OS",      "PMY", "S518"],
  ["Tuesday", "10:50", "11:45", "Computer Networks",                       "CN",      "AU",  "S519"],
  ["Tuesday", "11:45", "12:40", "Environmental Studies",                   "ES",      "HRM", "S519"],
  ["Tuesday", "15:40", "16:30", "Mathematical Foundation for Computing III", "MFC-III", "SG", "S518"],

  // WEDNESDAY
  ["Wednesday", "10:50", "11:45", "Operating System",                      "OS",      "PMY", "S518"],
  ["Wednesday", "11:45", "12:40", "Mathematical Foundation for Computing III", "MFC-III", "SG", "S518"],
  ["Wednesday", "13:40", "14:35", "Foundations of Artificial Intelligence", "FAI",    "AP",  "N517"],
  ["Wednesday", "14:35", "15:30", "Theory of Computation",                 "TOC",     "MB",  "S515"],

  // THURSDAY
  ["Thursday", "10:50", "11:45", "Operating System",                       "OS",      "PMY", "S518"],
  ["Thursday", "11:45", "12:40", "Mathematical Foundation for Computing III", "MFC-III", "SG", "S518"],
  ["Thursday", "13:40", "14:35", "Environmental Studies",                  "ES",      "HRM", "S519"],
  ["Thursday", "14:35", "15:30", "Computer Networks",                      "CN",      "AU",  "S519"],
];

let newSlots = 0;
for (const [day, start, end, subject, code, fCode, room] of LECTURES) {
  const exists = await Timetable.findOne({
    division_id: division._id, day, start_time: start, end_time: end,
  });
  if (exists) continue;

  await Timetable.create({
    division_id:  division._id,
    day,
    start_time:   start,
    end_time:     end,
    subject_name: subject,
    subject_code: code,
    faculty_id:   facultyMap[fCode],
    room_number:  room,
    slot_type:    "lecture",
  });
  newSlots++;
}

console.log(`✅ Timetable: ${newSlots} new entries (${LECTURES.length - newSlots} already existed)\n`);

// ── Summary ─────────────────────────────────────────────────
console.log("═══════════════════════════════════");
console.log(`Seeded 1 division, ${FACULTY_SEED.length} faculty, ${LECTURES.length} timetable entries`);
console.log("═══════════════════════════════════");
console.log("\nFaculty login credentials:");
FACULTY_SEED.forEach((f) => {
  console.log(`  ${f.code.padEnd(5)} ${f.name.padEnd(35)} ${f.code.toLowerCase()}@campusverse.in / Faculty@123`);
});

await mongoose.disconnect();
