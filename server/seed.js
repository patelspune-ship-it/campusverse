import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const testUsers = [
  {
    userId: "ADT24SOCB0001",
    email: "student@mitadt.edu",
    mobile: "9000000001",
    password: "student123",
    role: "student",
    institute_id: "INST01",
  },
  {
    userId: "clubadmin@mitadt.edu",
    email: "clubadmin@mitadt.edu",
    mobile: "9000000002",
    password: "club123",
    role: "club_admin",
    institute_id: "INST01",
  },
  {
    userId: "faculty@mitadt.edu",
    email: "faculty@mitadt.edu",
    mobile: "9000000003",
    password: "faculty123",
    role: "faculty",
    institute_id: "INST01",
  },
  {
    userId: "superadmin@mitadt.edu",
    email: "superadmin@mitadt.edu",
    mobile: "9000000004",
    password: "admin123",
    role: "super_admin",
    institute_id: null,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: "CampusVerseDB" });
  console.log("✅ Connected to MongoDB");

  for (const u of testUsers) {
    const exists = await User.findOne({ userId: u.userId });
    if (exists) {
      console.log(`⚠️  Already exists: ${u.userId} — skipping`);
      continue;
    }
    const hashed = await bcrypt.hash(u.password, 10);
    await User.create({ ...u, password: hashed });
    console.log(`✅ Created [${u.role}] → ${u.userId}`);
  }

  await mongoose.disconnect();
  console.log("\n🎉 Seed complete. Test credentials:");
  console.log("─────────────────────────────────────────────");
  for (const u of testUsers) {
    console.log(`Role: ${u.role.padEnd(12)} | ID: ${u.userId.padEnd(30)} | Pass: ${u.password}`);
  }
  console.log("─────────────────────────────────────────────");
}

seed().catch((err) => { console.error(err); process.exit(1); });
