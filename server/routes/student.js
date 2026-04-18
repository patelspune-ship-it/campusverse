import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import Registration from "../models/Registration.js";
import Event        from "../models/Event.js";
import User         from "../models/User.js";

const router = express.Router();
router.use(verifyToken, requireRole("student"));

// ─── STUDENT STATS ───────────────────────────────────────────
// GET /api/student/stats
router.get("/stats", async (req, res) => {
  try {
    const registrations = await Registration.find({ student_id: req.user.id });
    const eventIds = registrations.map((r) => r.event_id);

    const [events, attended, upcoming] = await Promise.all([
      Event.countDocuments({ _id: { $in: eventIds } }),
      Registration.countDocuments({ student_id: req.user.id, attendance_status: "full" }),
      Event.countDocuments({
        _id:    { $in: eventIds },
        status: "approved",
        date:   { $gt: new Date() },
      }),
    ]);

    res.json({
      eventsRegistered:   registrations.length,
      eventsAttended:     attended,
      certificatesEarned: attended, // Placeholder — Phase 9 will track certs separately
      activeRegistrations: upcoming,
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── UPCOMING REGISTERED EVENTS ──────────────────────────────
// GET /api/student/my-registrations
router.get("/my-registrations", async (req, res) => {
  try {
    const registrations = await Registration.find({ student_id: req.user.id })
      .select("event_id qr_code_path qr_token registered_at attendance_status entry_scanned exit_scanned");

    const regMap = Object.fromEntries(
      registrations.map((r) => [r.event_id.toString(), r])
    );
    const eventIds = registrations.map((r) => r.event_id);

    const events = await Event.find({
      _id:    { $in: eventIds },
      status: "approved",
      date:   { $gt: new Date() },
    })
      .sort({ date: 1 })
      .populate("club_id", "name logo_url");

    const result = events.map((e) => {
      const reg = regMap[e._id.toString()];
      return {
        ...e.toObject(),
        registration_id:   reg?._id             ?? null,
        qr_code_path:      reg?.qr_code_path    ?? null,
        qr_token:          reg?.qr_token        ?? null,
        registered_at:     reg?.registered_at   ?? null,
        attendance_status: reg?.attendance_status ?? "not_attended",
        entry_scanned:     reg?.entry_scanned   ?? false,
        exit_scanned:      reg?.exit_scanned    ?? false,
      };
    });

    res.json(result);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── PAST ATTENDED EVENTS ────────────────────────────────────
// GET /api/student/my-attended
router.get("/my-attended", async (req, res) => {
  try {
    const registrations = await Registration.find({
      student_id: req.user.id,
      attendance_status: { $in: ["partial", "full"] },
    }).select("event_id attendance_status duration_minutes");
    const regMap = Object.fromEntries(registrations.map((r) => [r.event_id.toString(), r]));
    const eventIds = registrations.map((r) => r.event_id);

    const events = await Event.find({ _id: { $in: eventIds } })
      .sort({ date: -1 })
      .populate("club_id", "name logo_url");

    const result = events.map((e) => {
      const reg = regMap[e._id.toString()];
      return {
        ...e.toObject(),
        attendance_status: reg?.attendance_status ?? "partial",
        duration_minutes:  reg?.duration_minutes  ?? null,
      };
    });

    res.json(result);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── GET MY REGISTERED EVENT IDS ─────────────────────────────
// GET /api/student/my-event-ids  (lightweight, for home/clubs page)
router.get("/my-event-ids", async (req, res) => {
  try {
    const registrations = await Registration.find({ student_id: req.user.id }).select("event_id");
    res.json(registrations.map((r) => r.event_id.toString()));
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
