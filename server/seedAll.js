import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

import Institute from "./models/Institute.js";
import Club from "./models/Club.js";
import User from "./models/User.js";
import { INSTITUTES, CLUBS } from "./seedData.js";

dotenv.config();

// ── Helpers ───────────────────────────────────────────────────

/** "MIT School of Engineering" → "mit.school.of.engineering@campusverse.in" */
function clubEmail(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")   // strip special chars
      .trim()
      .replace(/\s+/g, ".")           // spaces → dots
    + "@campusverse.in"
  );
}

// ── Main ──────────────────────────────────────────────────────

async function seedAll() {
  if (INSTITUTES.length === 0 || CLUBS.length === 0) {
    console.error(
      "❌  seedData.js is still empty.\n" +
      "    Fill in INSTITUTES and CLUBS arrays first, then re-run."
    );
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, { dbName: "CampusVerseDB" });
  console.log("✅ Connected to MongoDB\n");

  // ── 1. Seed Institutes ──────────────────────────────────────
  console.log("── Seeding Institutes ──────────────────────────");
  const instituteMap = {}; // code → ObjectId

  for (const inst of INSTITUTES) {
    let doc = await Institute.findOne({ code: inst.code });
    if (doc) {
      console.log(`  ⚠️  Already exists: [${inst.code}] ${inst.name}`);
    } else {
      doc = await Institute.create({ name: inst.name, code: inst.code });
      console.log(`  ✅ Created: [${inst.code}] ${inst.name}`);
    }
    instituteMap[inst.code] = doc._id;
  }

  // ── 2. Seed Clubs ───────────────────────────────────────────
  console.log("\n── Seeding Clubs ───────────────────────────────");
  const clubMap = {}; // club name → ObjectId

  for (const club of CLUBS) {
    let doc = await Club.findOne({ name: club.name });
    if (doc) {
      console.log(`  ⚠️  Already exists: ${club.name}`);
    } else {
      const institute_id = club.institute_code
        ? instituteMap[club.institute_code] ?? null
        : null;

      doc = await Club.create({ name: club.name, institute_id });
      console.log(
        `  ✅ Created: ${club.name}` +
        (club.institute_code ? ` [${club.institute_code}]` : " [university-wide]")
      );
    }
    clubMap[club.name] = doc._id;
  }

  // ── 3. Seed Club Admin Accounts ─────────────────────────────
  console.log("\n── Seeding Club Admin Accounts ─────────────────");
  const defaultPassword = "Club@123";
  const hashed = await bcrypt.hash(defaultPassword, 10);

  const created = [];
  const skipped = [];

  for (const club of CLUBS) {
    const email = clubEmail(club.name);
    const existing = await User.findOne({ userId: email });

    if (existing) {
      skipped.push(email);
      console.log(`  ⚠️  Already exists: ${email}`);
      continue;
    }

    const clubDoc = await Club.findOne({ name: club.name });

    await User.create({
      userId: email,
      email,
      password: hashed,
      role: "club_admin",
      club_id: clubDoc._id,
      institute_id: clubDoc.institute_id ?? null,
      must_change_password: true,
      profile_completed: false,
    });

    created.push({ club: club.name, email });
    console.log(`  ✅ Admin: ${email}  →  "${club.name}"`);
  }

  // ── Summary ─────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════");
  console.log(`Institutes : ${INSTITUTES.length} total`);
  console.log(`Clubs      : ${CLUBS.length} total`);
  console.log(`Admins     : ${created.length} created, ${skipped.length} skipped`);
  console.log(`\nDefault password for all new club admins: ${defaultPassword}`);
  console.log("They will be forced to change it on first login.");
  console.log("══════════════════════════════════════════════════\n");

  await mongoose.disconnect();
}

seedAll().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
