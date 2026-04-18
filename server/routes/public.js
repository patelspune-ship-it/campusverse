/**
 * Public routes — no authentication required.
 * Mounted at /api/public in server.js
 */
import express from "express";
import Club         from "../models/Club.js";
import Event        from "../models/Event.js";
import Institute    from "../models/Institute.js";
import Registration from "../models/Registration.js";

const router = express.Router();

// ─── UPCOMING EVENTS ────────────────────────────────────────
// GET /api/public/events/upcoming
router.get("/events/upcoming", async (req, res) => {
  try {
    const events = await Event.find({
      status:        "approved",
      date:          { $gt: new Date() },
      is_past_event: false,
    })
      .sort({ date: 1 })
      .populate("club_id", "name logo_url category");

    const regCounts = await Registration.aggregate([
      { $group: { _id: "$event_id", count: { $sum: 1 } } },
    ]);
    const regMap = Object.fromEntries(regCounts.map((r) => [r._id.toString(), r.count]));

    res.json(
      events.map((e) => ({
        ...e.toObject(),
        registrationCount: regMap[e._id.toString()] ?? 0,
      }))
    );
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── ALL CLUBS ───────────────────────────────────────────────
// GET /api/public/clubs
router.get("/clubs", async (req, res) => {
  try {
    const clubs = await Club.find()
      .sort({ name: 1 })
      .populate("institute_id", "name code");

    const eventCounts = await Event.aggregate([
      { $group: { _id: "$club_id", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(eventCounts.map((e) => [e._id.toString(), e.count]));

    res.json(
      clubs.map((c) => ({
        ...c.toObject(),
        eventCount: countMap[c._id.toString()] ?? 0,
      }))
    );
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── SINGLE CLUB + ITS EVENTS ────────────────────────────────
// GET /api/public/clubs/:id
router.get("/clubs/:id", async (req, res) => {
  try {
    const club = await Club.findById(req.params.id).populate("institute_id", "name code");
    if (!club) return res.status(404).json({ message: "Club not found" });

    const [upcomingEvents, pastEvents] = await Promise.all([
      Event.find({
        club_id: club._id, status: "approved",
        date: { $gt: new Date() }, is_past_event: false,
      }).sort({ date: 1 }),
      Event.find({ club_id: club._id, is_past_event: true })
        .sort({ date: -1 }).limit(10),
    ]);

    const upcomingIds = upcomingEvents.map((e) => e._id);
    const regCounts   = await Registration.aggregate([
      { $match: { event_id: { $in: upcomingIds } } },
      { $group: { _id: "$event_id", count: { $sum: 1 } } },
    ]);
    const regMap = Object.fromEntries(regCounts.map((r) => [r._id.toString(), r.count]));

    res.json({
      club: club.toObject(),
      upcomingEvents: upcomingEvents.map((e) => ({
        ...e.toObject(),
        registrationCount: regMap[e._id.toString()] ?? 0,
      })),
      pastEvents: pastEvents.map((e) => e.toObject()),
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── INSTITUTES ──────────────────────────────────────────────
// GET /api/public/institutes
router.get("/institutes", async (req, res) => {
  try {
    const institutes = await Institute.find().sort({ name: 1 });
    res.json(institutes);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
