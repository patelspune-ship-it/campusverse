import express from "express";
import jwt      from "jsonwebtoken";
import mongoose from "mongoose";
import Registration from "../models/Registration.js";
import Event        from "../models/Event.js";
import User         from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { generateCertificate } from "../services/certificateService.js";
import { createVerificationRequestsForEvent } from "../services/attendanceRoutingService.js";

const router = express.Router();

// ─── HELPERS ──────────────────────────────────────────────────

function verifyQrToken(token) {
  return jwt.verify(token, process.env.QR_SECRET);
}

async function resolveRegistration(qr_token, res) {
  let payload;
  try {
    payload = verifyQrToken(qr_token);
  } catch (err) {
    res.status(401).json({
      message: err.name === "TokenExpiredError"
        ? "QR code has expired"
        : "Invalid or tampered QR code",
    });
    return null;
  }

  const { registration_id, student_id, event_id } = payload;
  const registration = await Registration.findById(registration_id).catch(() => null);
  if (!registration) { res.status(404).json({ message: "Registration not found" }); return null; }

  if (
    registration.student_id.toString() !== student_id ||
    registration.event_id.toString()   !== event_id
  ) {
    res.status(401).json({ message: "QR payload mismatch — possible tampering" });
    return null;
  }

  return { registration, payload };
}

// ─── PERMISSION CHECK ──────────────────────────────────────────
// Club admin: can only scan events belonging to their club
// Faculty: can scan events in their institute
// Super admin: unrestricted
async function checkScanPermission(req, res, eventId) {
  const role = req.user.role;
  if (role === "super_admin") return true;

  const event = await Event.findById(eventId).populate("club_id", "institute_id").catch(() => null);
  if (!event) { res.status(404).json({ message: "Event not found" }); return false; }

  if (role === "club_admin") {
    const scannerUser = await User.findById(req.user.id).select("club_id");
    if (!scannerUser?.club_id || scannerUser.club_id.toString() !== event.club_id._id.toString()) {
      res.status(403).json({ message: "You can only scan attendees for your own club's events" });
      return false;
    }
  }

  if (role === "faculty") {
    const scannerUser = await User.findById(req.user.id).select("institute_id");
    const eventInstId = event.club_id?.institute_id?.toString();
    if (!scannerUser?.institute_id || scannerUser.institute_id.toString() !== eventInstId) {
      res.status(403).json({ message: "You can only scan attendees for events in your institute" });
      return false;
    }
  }

  return true;
}

// ─── ENTRY SCAN ───────────────────────────────────────────────
// POST /api/attendance/entry
// Auth: club_admin | faculty | super_admin
// Body: { qr_token }
router.post(
  "/entry",
  verifyToken,
  requireRole("club_admin", "faculty", "super_admin"),
  async (req, res) => {
    try {
      const { qr_token } = req.body;
      if (!qr_token) return res.status(400).json({ message: "qr_token is required" });

      const resolved = await resolveRegistration(qr_token, res);
      if (!resolved) return;
      const { registration, payload } = resolved;

      const allowed = await checkScanPermission(req, res, payload.event_id);
      if (!allowed) return;

      if (registration.entry_scanned) {
        const student = await User.findById(registration.student_id).select("name userId").catch(() => null);
        return res.status(409).json({
          message:         "Entry already scanned",
          entry_scanned_at: registration.entry_scanned_at,
          student_name:    student?.name ?? student?.userId ?? "Unknown",
          student_prn:     student?.userId ?? "",
        });
      }

      const now = new Date();
      await Registration.findByIdAndUpdate(registration._id, {
        entry_scanned:    true,
        entry_scanned_at: now,
        attendance_status: "partial",
      });

      const [event, student] = await Promise.all([
        Event.findById(payload.event_id).select("name date venue start_time").catch(() => null),
        User.findById(registration.student_id).select("name userId").catch(() => null),
      ]);

      return res.json({
        success:         true,
        scan_type:       "entry",
        student_name:    student?.name ?? student?.userId ?? "Unknown",
        student_prn:     student?.userId ?? "",
        event_name:      event?.name ?? "",
        entry_scanned_at: now,
        message:         `Entry recorded for ${student?.name ?? "student"}`,
      });
    } catch (err) {
      console.error("Entry scan error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ─── EXIT SCAN ────────────────────────────────────────────────
// POST /api/attendance/exit
// Auth: club_admin | faculty | super_admin
// Body: { qr_token }
router.post(
  "/exit",
  verifyToken,
  requireRole("club_admin", "faculty", "super_admin"),
  async (req, res) => {
    try {
      const { qr_token } = req.body;
      if (!qr_token) return res.status(400).json({ message: "qr_token is required" });

      const resolved = await resolveRegistration(qr_token, res);
      if (!resolved) return;
      const { registration, payload } = resolved;

      const allowed = await checkScanPermission(req, res, payload.event_id);
      if (!allowed) return;

      if (!registration.entry_scanned) {
        return res.status(400).json({ message: "Entry hasn't been scanned yet — scan entry first" });
      }

      if (registration.exit_scanned) {
        const student = await User.findById(registration.student_id).select("name userId").catch(() => null);
        return res.status(409).json({
          message:        "Exit already scanned",
          exit_scanned_at: registration.exit_scanned_at,
          duration_minutes: registration.duration_minutes,
          student_name:   student?.name ?? student?.userId ?? "Unknown",
          student_prn:    student?.userId ?? "",
        });
      }

      const now = new Date();
      const duration_minutes = Math.round(
        (now - new Date(registration.entry_scanned_at)) / (1000 * 60)
      );

      await Registration.findByIdAndUpdate(registration._id, {
        exit_scanned:      true,
        exit_scanned_at:   now,
        attendance_status: "full",
        duration_minutes,
      });

      const [event, student] = await Promise.all([
        Event.findById(payload.event_id).select("name").catch(() => null),
        User.findById(registration.student_id).select("name userId").catch(() => null),
      ]);

      // Fire-and-forget: generate cert + create verification requests
      // Uses setImmediate so the scanner response returns instantly
      setImmediate(async () => {
        try {
          await generateCertificate(registration._id);
          console.log(`✅ [exit-scan] Cert generated for reg ${registration._id}`);
        } catch (err) {
          console.error(`[exit-scan] Cert generation failed for reg ${registration._id}:`, err.message ?? err);
        }
        try {
          await createVerificationRequestsForEvent(payload.event_id);
        } catch (err) {
          console.error(`[exit-scan] Routing failed for event ${payload.event_id}:`, err.message ?? err);
        }
      });

      return res.json({
        success:          true,
        scan_type:        "exit",
        student_name:     student?.name ?? student?.userId ?? "Unknown",
        student_prn:      student?.userId ?? "",
        event_name:       event?.name ?? "",
        exit_scanned_at:  now,
        duration_minutes,
        message:          `Exit recorded — ${duration_minutes} min attendance for ${student?.name ?? "student"}`,
      });
    } catch (err) {
      console.error("Exit scan error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ─── VERIFY QR (pre-check, does NOT mark attendance) ──────────
// POST /api/attendance/verify-qr
// Body: { qr_token }
router.post("/verify-qr", async (req, res) => {
  const { qr_token } = req.body;
  if (!qr_token) return res.status(400).json({ message: "qr_token is required" });

  let payload;
  try {
    payload = verifyQrToken(qr_token);
  } catch (err) {
    return res.status(401).json({
      message: err.name === "TokenExpiredError"
        ? "QR code has expired"
        : "Invalid or tampered QR code",
    });
  }

  const { registration_id, student_id, event_id } = payload;
  const registration = await Registration.findById(registration_id).catch(() => null);
  if (!registration) return res.status(404).json({ message: "Registration not found" });

  if (
    registration.student_id.toString() !== student_id ||
    registration.event_id.toString()   !== event_id
  ) {
    return res.status(401).json({ message: "QR payload mismatch — possible tampering" });
  }

  const [event, student] = await Promise.all([
    Event.findById(event_id).populate("club_id", "name").catch(() => null),
    User.findById(student_id).select("name userId").catch(() => null),
  ]);

  if (!event)   return res.status(404).json({ message: "Event not found" });
  if (!student) return res.status(404).json({ message: "Student not found" });

  const now       = new Date();
  const eventDate = new Date(event.date);
  const hoursDiff = (eventDate - now) / (1000 * 60 * 60);
  if (hoursDiff > 24) {
    return res.status(400).json({
      message:    `Event hasn't started yet — it's on ${eventDate.toLocaleDateString("en-IN")}`,
      event_date: event.date,
    });
  }

  return res.json({
    valid:             true,
    registration_id:   registration._id,
    attendance_status: registration.attendance_status,
    entry_scanned:     registration.entry_scanned,
    exit_scanned:      registration.exit_scanned,
    student_name:      student.name  ?? student.userId,
    student_prn:       student.userId,
    event_name:        event.name,
    event_date:        event.date,
    venue:             event.venue,
    club_name:         event.club_id?.name ?? "Unknown Club",
  });
});

export default router;
