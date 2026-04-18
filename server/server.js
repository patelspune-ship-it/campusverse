import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ✅ IMPORT ROUTES (only once)
import authRoutes from "./routes/auth.js";

// ✅ MongoDB Connection
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "CampusVerseDB",
    });
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ Database Connection Error:", error);
    process.exit(1);
  }
}
import eventRoutes from "./routes/events.js";

connectDB();

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);

// Test Route
app.get("/", (req, res) => res.send("CampusVerse API Running ✅"));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
