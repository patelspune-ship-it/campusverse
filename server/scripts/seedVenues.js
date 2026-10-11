// Seeds a realistic set of MIT-ADT venues under MIT School of Computing.
// Idempotent — find-or-create keyed on {institute_id, code}, like
// seedHierarchy.js does for departments. Safe to re-run.
// Run with: node scripts/seedVenues.js
import "dotenv/config";
import mongoose from "mongoose";
import Institute from "../models/Institute.js";
import Venue from "../models/Venue.js";

await mongoose.connect(process.env.MONGO_URI, { dbName: "CampusVerseDB" });
console.log("✅ Connected\n");

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

const VENUES_SEED = [
  { name: "Multipurpose Auditorium", code: "AUD-1", venue_type: "auditorium",      capacity: 800,  location: "Main Building, Ground Floor",     amenities: ["Stage", "PA System", "Projector", "AC"] },
  { name: "MIT Convocation Hall",    code: "AUD-2", venue_type: "auditorium",      capacity: 500,  location: "Admin Block",                     amenities: ["Stage", "PA System", "AC"] },
  { name: "Seminar Hall S518",       code: "S518",  venue_type: "seminar_hall",    capacity: 120,  location: "School of Computing, 5th Floor",  amenities: ["Projector", "AC", "Whiteboard"] },
  { name: "Seminar Hall S519",       code: "S519",  venue_type: "seminar_hall",    capacity: 120,  location: "School of Computing, 5th Floor",  amenities: ["Projector", "AC"] },
  { name: "Seminar Hall N517",       code: "N517",  venue_type: "seminar_hall",    capacity: 100,  location: "North Wing, 5th Floor",           amenities: ["Projector"] },
  { name: "Classroom S515",          code: "S515",  venue_type: "classroom",       capacity: 60,   location: "School of Computing, 5th Floor",  amenities: ["Whiteboard"] },
  { name: "Classroom S520",          code: "S520",  venue_type: "classroom",       capacity: 60,   location: "School of Computing, 5th Floor",  amenities: ["Whiteboard", "Projector"] },
  { name: "Computer Lab CL-1",       code: "CL-1",  venue_type: "lab",             capacity: 45,   location: "School of Computing, 4th Floor",  amenities: ["Computers", "AC"] },
  { name: "Computer Lab CL-2",       code: "CL-2",  venue_type: "lab",             capacity: 45,   location: "School of Computing, 4th Floor",  amenities: ["Computers", "AC"] },
  { name: "Central Ground",          code: "GRD-1", venue_type: "open_ground",     capacity: 3000, location: "Campus Central Lawn",             amenities: ["Open Space"] },
  { name: "Sports Complex Indoor Court", code: "SPT-1", venue_type: "sports_facility", capacity: 300, location: "Sports Complex",              amenities: ["Indoor Court", "Changing Rooms"] },
];

console.log("── Venues ───────────────────────────────────────────");
let created = 0;
let existing = 0;
for (const v of VENUES_SEED) {
  let venue = await Venue.findOne({ institute_id: institute._id, code: v.code });
  if (!venue) {
    venue = await Venue.create({ ...v, institute_id: institute._id });
    created++;
    console.log(`  ✅ Created: ${v.name} (${v.code})`);
  } else {
    existing++;
    console.log(`  ℹ️  Already exists: ${v.name} (${v.code})`);
  }
}

console.log("\n═══════════════════════════════════════════════════");
console.log(`Seeded ${VENUES_SEED.length} venues: ${created} created, ${existing} already existed`);
console.log("═══════════════════════════════════════════════════");

await mongoose.disconnect();
console.log("\n✅ Done.");
