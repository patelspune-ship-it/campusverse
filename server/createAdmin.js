/**
 * Run once to create the super admin account.
 * Usage: node server/createAdmin.js
 */
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: "CampusVerseDB" });
  console.log("✅ Connected to MongoDB");

  const userId = "admin@campusverse.in";
  const existing = await User.findOne({ userId });

  if (existing) {
    console.log("⚠️  Super admin already exists — skipping creation.");
    console.log(`   userId : ${existing.userId}`);
    console.log(`   role   : ${existing.role}`);
  } else {
    const hashed = await bcrypt.hash("Admin@123", 10);
    await User.create({
      userId,
      email:                userId,
      role:                 "super_admin",
      password:             hashed,
      must_change_password: true,
    });
    console.log("✅ Super admin created!");
    console.log("   userId   : admin@campusverse.in");
    console.log("   password : Admin@123  (must change on first login)");
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
