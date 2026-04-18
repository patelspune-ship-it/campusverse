import express from "express";
import jwt      from "jsonwebtoken";
import Registration from "../models/Registration.js";
import Event        from "../models/Event.js";
import User         from "../models/User.js";
import Club         from "../models/Club.js";

const router = express.Router();

// ─── VERIFY QR (scanner uses this — no auth required, scanner has own flow) ──
// POST /api/attendance/verify-qr
// Body: { qr_token: "..." }
router.post("/verify-qr", async (req, res) => {
  const { qr_token } = req.body;
  if (!qr_token) return res.status(400).json({ message: "qr_token is required" });

  // 1. Verify JWT signature
  let payload;
  try {
    payload = jwt.verify(qr_token, process.env.QR_SECRET);
  } catch (err) {
    return res.status(401).json({
      message: err.name === "TokenExpiredError"
        ? "QR code has expired"
        : "Invalid or tampered QR code",
    });
  }

  const { registration_id, student_id, event_id } = payload;

  // 2. Find registration
  const registration = await Registration.findById(registration_id).catch(() => null);
  if (!registration) return res.status(404).json({ message: "Registration not found" });

  // 3. Cross-check IDs haven't been swapped
  if (
    registration.student_id.toString() !== student_id ||
    registration.event_id.toString()   !== event_id
  ) {
    return res.status(401).json({ message: "QR payload mismatch — possible tampering" });
  }

  // 4. Already attended?
  if (registration.attended) {
    return res.status(409).json({
      message:     "Already scanned",
      attended_at: registration.attended_at,
    });
  }

  // 5. Fetch event + student + club
  const [event, student] = await Promise.all([
    Event.findById(event_id).populate("club_id", "name").catch(() => null),
    User.findById(student_id).select("name userId").catch(() => null),
  ]);

  if (!event)   return res.status(404).json({ message: "Event not found" });
  if (!student) return res.status(404).json({ message: "Student not found" });

  // 6. Optional: check event is happening today (within 24 h window)
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
    valid:           true,
    registration_id: registration._id,
    student_name:    student.name  ?? student.userId,
    student_prn:     student.userId,
    event_name:      event.name,
    event_date:      event.date,
    venue:           event.venue,
    club_name:       event.club_id?.name ?? "Unknown Club",
  });
});

export default router;
