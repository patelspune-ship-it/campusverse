// Run with: node scripts/fixUser.js
import "dotenv/config";
import mongoose from "mongoose";
import User         from "../models/User.js";
import Institute    from "../models/Institute.js";
import Registration from "../models/Registration.js";

await mongoose.connect(process.env.MONGO_URI, { dbName: "CampusVerseDB" });
console.log("✅ Connected\n");

// 1. Delete broken registrations with null student_id or null event_id
const deleted = await Registration.deleteMany({
  $or: [{ student_id: null }, { event_id: null }],
});
console.log(`🗑️  Deleted ${deleted.deletedCount} broken registration(s) with null student_id/event_id\n`);

// 2. Find user
const user = await User.findOne({ email: "patelspune@gmail.com" });
if (!user) {
  console.error("❌ User not found with email patelspune@gmail.com");
  await mongoose.disconnect();
  process.exit(1);
}
console.log("Found user:");
console.log(`  _id    : ${user._id}`);
console.log(`  userId : ${user.userId}`);
console.log(`  email  : ${user.email}`);
console.log(`  role   : ${user.role}`);
console.log(`  name   : ${user.name}`);

// 3. Get first institute
const institute = await Institute.findOne({});
if (!institute) {
  console.error("❌ No institutes found in DB");
  await mongoose.disconnect();
  process.exit(1);
}
console.log(`\n✅ Using institute: ${institute.name} (${institute._id})`);

// 4. Only set fields that are missing/null — never overwrite existing values
const updates = {};
if (!user.role || user.role !== "student")        updates.role = "student";
if (!user.name)                                   updates.name = "Amaan Patel";
if (!user.institute_id)                           updates.institute_id = institute._id;
if (!user.department)                             updates.department = "Computer Engineering";
if (!user.year)                                   updates.year = "2nd";
if (!user.profile_completed)                      updates.profile_completed = true;
if (user.must_change_password)                    updates.must_change_password = false;

if (Object.keys(updates).length === 0) {
  console.log("\n✅ User already has all required fields — nothing to update");
} else {
  await User.updateOne({ _id: user._id }, { $set: updates });
  console.log("\n✅ Updated user fields:");
  for (const [k, v] of Object.entries(updates)) console.log(`   ${k}: ${v}`);
}

// 5. Print final state
const updated = await User.findOne({ email: "patelspune@gmail.com" });
console.log("\n📋 Final user state:");
console.log(`  _id               : ${updated._id}`);
console.log(`  userId (PRN)      : ${updated.userId}`);
console.log(`  email             : ${updated.email}`);
console.log(`  role              : ${updated.role}`);
console.log(`  name              : ${updated.name}`);
console.log(`  institute_id      : ${updated.institute_id}`);
console.log(`  department        : ${updated.department}`);
console.log(`  year              : ${updated.year}`);
console.log(`  profile_completed : ${updated.profile_completed}`);

await mongoose.disconnect();
console.log("\n✅ Done.");
