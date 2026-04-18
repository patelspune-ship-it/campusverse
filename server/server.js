import express from "express";
import mongoose from "mongoose";
import cors    from "cors";
import dotenv  from "dotenv";
import cron    from "node-cron";
import Event        from "./models/Event.js";
import { generateCertificatesForEvent } from "./services/certificateService.js";

dotenv.config();

const app = express();

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  /^http:\/\/192\.168\.\d+\.\d+:8080$/,
  /^http:\/\/192\.168\.\d+\.\d+:5173$/,
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser requests
    const allowed = allowedOrigins.some((o) =>
      typeof o === "string" ? o === origin : o.test(origin)
    );
    callback(allowed ? null : new Error("CORS: origin not allowed"), allowed);
  },
  credentials: true,
}));
app.use(express.json());

// ✅ IMPORT ROUTES
import authRoutes   from "./routes/auth.js";
import eventRoutes  from "./routes/events.js";
import publicRoutes from "./routes/public.js";
// Role-scoped route groups
import studentRoutes from "./routes/student.js";
import clubRoutes    from "./routes/club.js";
import facultyRoutes from "./routes/faculty.js";
import adminRoutes      from "./routes/admin.js";
import attendanceRoutes from "./routes/attendance.js";

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
app.use("/api/auth",   authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/public", publicRoutes);

// ✅ Role-scoped routes (RBAC enforced inside each router)
app.use("/api/student", studentRoutes);
app.use("/api/club", clubRoutes);
app.use("/api/faculty",     facultyRoutes);
app.use("/api/admin",      adminRoutes);
app.use("/api/attendance", attendanceRoutes);

// Test Route
app.get("/", (req, res) => res.send("CampusVerse API Running ✅"));

// ── Daily certificate generation cron (2:00 AM) ───────────────
// Finds all approved events that ended before now and haven't had
// certificates generated yet, then generates for all full-attendance students.
cron.schedule("0 2 * * *", async () => {
  console.log("⏰ [CRON] Starting certificate generation job…");
  try {
    const events = await Event.find({
      status:                 "approved",
      date:                   { $lt: new Date() },
      certificates_generated: false,
      is_past_event:          false,
    }).select("_id name");

    console.log(`[CRON] Found ${events.length} event(s) needing certificates`);

    for (const event of events) {
      try {
        const result = await generateCertificatesForEvent(event._id);
        console.log(`[CRON] ✅ ${event.name}: ${result.generated} generated, ${result.failed} failed`);
      } catch (err) {
        console.error(`[CRON] ❌ ${event.name}:`, err.message);
      }
    }
    console.log("⏰ [CRON] Certificate job complete");
  } catch (err) {
    console.error("[CRON] Job failed:", err);
  }
}, { timezone: "Asia/Kolkata" });

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on http://0.0.0.0:${PORT} (LAN accessible)`)
);
