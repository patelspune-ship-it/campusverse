// Run with: node scripts/seedFullAttendance.js
import "dotenv/config";
import mongoose from "mongoose";
import User         from "../models/User.js";
import Event        from "../models/Event.js";
import Registration from "../models/Registration.js";

await mongoose.connect(process.env.MONGO_URI, { dbName: "CampusVerseDB" });
console.log("✅ Connected\n");

// 1. Find student — ABORT if not found, never proceed with null student
const student = await User.findOne({ email: "patelspune@gmail.com", role: "student" });
if (!student) {
  console.error("❌ Student not found with email patelspune@gmail.com and role=student");
  console.error("   Run fixUser.js first to repair the account.");
  await mongoose.disconnect();
  process.exit(1);
}
if (!student._id) {
  console.error("❌ Student document has no _id — aborting");
  await mongoose.disconnect();
  process.exit(1);
}

console.log("✅ Student found:");
console.log(`   _id        : ${student._id}`);
console.log(`   name       : ${student.name}`);
console.log(`   userId/PRN : ${student.userId}`);
console.log(`   email      : ${student.email}`);
console.log(`   role       : ${student.role}`);

// 2. Find past approved event — ABORT if not found, never proceed with null event
let event = await Event.findOne({ status: "approved", date: { $lt: new Date() } });

if (!event) {
  console.log("\n⚠️  No past approved events found. Attempting to use GAMIFICATION event…");
  const gamification = await Event.findOne({ name: /GAMIFICATION/i });
  if (!gamification) {
    console.error("❌ No past approved events and no GAMIFICATION event found. Aborting.");
    await mongoose.disconnect();
    process.exit(1);
  }
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  gamification.date   = yesterday;
  gamification.status = "approved";
  await gamification.save();
  event = gamification;
  console.log(`✅ Moved "${event.name}" to yesterday and set status=approved`);
} else {
  console.log(`\n✅ Using past event: "${event.name}"`);
}

if (!event._id) {
  console.error("❌ Event document has no _id — aborting");
  await mongoose.disconnect();
  process.exit(1);
}

console.log(`   _id    : ${event._id}`);
console.log(`   date   : ${event.date.toISOString()}`);
console.log(`   status : ${event.status}`);

// 3. Upsert registration with full attendance (both IDs verified non-null above)
const now       = new Date();
const entryTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
const exitTime  = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago

const reg = await Registration.findOneAndUpdate(
  { student_id: student._id, event_id: event._id },
  {
    $set: {
      attendance_status: "full",
      entry_scanned:     true,
      entry_scanned_at:  entryTime,
      exit_scanned:      true,
      exit_scanned_at:   exitTime,
      duration_minutes:  30,
    },
    $setOnInsert: {
      student_id: student._id,
      event_id:   event._id,
    },
  },
  { upsert: true, new: true }
);

console.log(`\n✅ Registration upserted:`);
console.log(`   _id               : ${reg._id}`);
console.log(`   student_id        : ${reg.student_id}  (${student.name})`);
console.log(`   event_id          : ${reg.event_id}  (${event.name})`);
console.log(`   attendance_status : ${reg.attendance_status}`);
console.log(`   duration_minutes  : ${reg.duration_minutes}`);
console.log(`   entry_scanned_at  : ${reg.entry_scanned_at}`);
console.log(`   exit_scanned_at   : ${reg.exit_scanned_at}`);

console.log("\n🎯 Next step — trigger certificate generation:");
console.log(`   Admin UI : All Events → find "${event.name}" → click "Certs"`);
console.log(`   API call : POST /api/admin/events/${event._id}/generate-certificates`);

await mongoose.disconnect();
console.log("\n✅ Done.");
