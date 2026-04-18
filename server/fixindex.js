import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

await mongoose.connect(process.env.MONGO_URI, { dbName: "CampusVerseDB" });
const col = mongoose.connection.collection("users");

try {
  await col.dropIndex("prn_1");
  console.log("✅ Dropped old prn_1 index");
} catch (e) {
  console.log("ℹ️  prn_1 index not found (already gone):", e.message);
}

await mongoose.disconnect();
