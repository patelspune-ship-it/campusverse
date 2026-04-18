import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ✅ IMPORT ROUTES
import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/events.js";
// Role-scoped route groups
import studentRoutes from "./routes/student.js";
import clubRoutes from "./routes/club.js";
import facultyRoutes from "./routes/faculty.js";
import adminRoutes from "./routes/admin.js";

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

connectDB();

// ✅ Existing routes (unchanged)
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);

// ✅ Role-scoped routes (RBAC enforced inside each router)
app.use("/api/student", studentRoutes);
app.use("/api/club", clubRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/admin", adminRoutes);

// Test Route
app.get("/", (req, res) => res.send("CampusVerse API Running ✅"));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
