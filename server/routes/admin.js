import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import Club from "../models/Club.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import Institute from "../models/Institute.js";
import Registration from "../models/Registration.js";
import AttendanceVerificationRequest from "../models/AttendanceVerificationRequest.js";
import { generateCertificatesForEvent } from "../services/certificateService.js";
import { createVerificationRequestsForEvent } from "../services/attendanceRoutingService.js";

const router = express.Router();
router.use(verifyToken, requireRole("super_admin"));

// ─── HEALTH CHECK ────────────────────────────────────────────
router.get("/ping", (req, res) => {
  res.json({ message: "Super admin route accessible", user: req.user });
});

// ─── PLATFORM STATS ─────────────────────────────────────────
// GET /api/admin/stats
router.get("/stats", async (req, res) => {
  try {
    const [students, clubs, institutes, events, pendingEvents, upcomingEvents] =
      await Promise.all([
        User.countDocuments({ role: "student" }),
        Club.countDocuments(),
        Institute.countDocuments(),
        Event.countDocuments(),
        Event.countDocuments({ status: "pending" }),
        Event.countDocuments({ status: "approved", date: { $gt: new Date() } }),
      ]);
    res.json({ students, clubs, institutes, events, pendingEvents, upcomingEvents });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── PENDING EVENTS ──────────────────────────────────────────
// GET /api/admin/pending-events
router.get("/pending-events", async (req, res) => {
  try {
    const events = await Event.find({ status: "pending" })
      .sort({ created_at: -1 })
      .populate("club_id", "name logo_url");
    res.json(events);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── APPROVE EVENT ───────────────────────────────────────────
// PATCH /api/admin/events/:id/approve
router.patch("/events/:id/approve", async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "approved", rejection_reason: null } },
      { new: true }
    ).populate("club_id", "name logo_url");
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Event approved", event });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── REJECT EVENT ────────────────────────────────────────────
// PATCH /api/admin/events/:id/reject
router.patch("/events/:id/reject", async (req, res) => {
  const { rejection_reason } = req.body;
  if (!rejection_reason?.trim()) {
    return res.status(400).json({ message: "Rejection reason is required" });
  }
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "rejected", rejection_reason: rejection_reason.trim() } },
      { new: true }
    ).populate("club_id", "name logo_url");
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Event rejected", event });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── ALL EVENTS (with filters) ───────────────────────────────
// GET /api/admin/events?status=&club_id=&date_from=&date_to=
router.get("/events", async (req, res) => {
  try {
    const { status, club_id, date_from, date_to } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (club_id)               filter.club_id = club_id;
    if (date_from || date_to) {
      filter.date = {};
      if (date_from) filter.date.$gte = new Date(date_from);
      if (date_to)   filter.date.$lte = new Date(date_to);
    }

    const events = await Event.find(filter)
      .sort({ created_at: -1 })
      .populate("club_id", "name logo_url");

    // Attach registration count per event in one aggregation
    const regCounts = await Registration.aggregate([
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
    ]);
    const regMap = Object.fromEntries(regCounts.map((r) => [r._id, r.count]));

    const result = events.map((e) => ({
      ...e.toObject(),
      registrationCount: regMap[e._id.toString()] ?? 0,
    }));

    res.json(result);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── ALL CLUBS ───────────────────────────────────────────────
// GET /api/admin/clubs?institute_id=&category=&search=
router.get("/clubs", async (req, res) => {
  try {
    const { institute_id, category, search } = req.query;
    const filter = {};
    if (institute_id && institute_id !== "all") filter.institute_id = institute_id;
    if (category && category !== "all")         filter.category = category;
    if (search) filter.name = { $regex: search, $options: "i" };

    const clubs = await Club.find(filter)
      .sort({ name: 1 })
      .populate("institute_id", "name code");

    // Event counts in one aggregation
    const eventCounts = await Event.aggregate([
      { $group: { _id: "$club_id", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(
      eventCounts.map((e) => [e._id.toString(), e.count])
    );

    // Club admins
    const admins = await User.find({ role: "club_admin" }).select("club_id userId email");
    const adminMap = Object.fromEntries(
      admins.map((a) => [a.club_id?.toString(), { userId: a.userId, email: a.email }])
    );

    const result = clubs.map((c) => ({
      ...c.toObject(),
      eventCount: countMap[c._id.toString()] ?? 0,
      admin: adminMap[c._id.toString()] ?? null,
    }));

    res.json(result);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── ALL STUDENTS ────────────────────────────────────────────
// GET /api/admin/students?search=&institute_id=
router.get("/students", async (req, res) => {
  try {
    const { search, institute_id } = req.query;
    const filter = { role: "student" };
    if (institute_id && institute_id !== "all") filter.institute_id = institute_id;
    if (search) {
      filter.$or = [
        { userId: { $regex: search, $options: "i" } },
        { email:  { $regex: search, $options: "i" } },
      ];
    }

    const students = await User.find(filter)
      .sort({ _id: -1 })
      .select("-password")
      .populate("institute_id", "name code");

    // Registration counts in one aggregation
    const regCounts = await Registration.aggregate([
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]);
    const regMap = Object.fromEntries(regCounts.map((r) => [r._id, r.count]));

    const result = students.map((s) => ({
      ...s.toObject(),
      registrationCount: regMap[s.userId] ?? 0,
    }));

    res.json(result);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── ALL INSTITUTES ──────────────────────────────────────────
// GET /api/admin/institutes
router.get("/institutes", async (req, res) => {
  try {
    const institutes = await Institute.find().sort({ name: 1 });

    const [studentCounts, clubCounts] = await Promise.all([
      User.aggregate([
        { $match: { role: "student" } },
        { $group: { _id: "$institute_id", count: { $sum: 1 } } },
      ]),
      Club.aggregate([
        { $group: { _id: "$institute_id", count: { $sum: 1 } } },
      ]),
    ]);

    const sMap = Object.fromEntries(studentCounts.map((x) => [x._id?.toString(), x.count]));
    const cMap = Object.fromEntries(clubCounts.map((x) => [x._id?.toString(), x.count]));

    const result = institutes.map((inst) => ({
      ...inst.toObject(),
      studentCount: sMap[inst._id.toString()] ?? 0,
      clubCount:    cMap[inst._id.toString()] ?? 0,
    }));

    res.json(result);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── MANUAL CERTIFICATE GENERATION ──────────────────────────
// POST /api/admin/events/:id/generate-certificates
router.post("/events/:id/generate-certificates", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const result = await generateCertificatesForEvent(event._id);

    res.json({
      message:   `Generated ${result.generated} certificate(s). ${result.failed} failed.`,
      generated: result.generated,
      failed:    result.failed,
    });
  } catch (err) {
    console.error("Manual cert generation error:", err);
    res.status(500).json({ message: err.message ?? "Server error" });
  }
});

// ─── MANUAL VERIFICATION REQUEST CREATION ───────────────────
// POST /api/admin/events/:id/create-verifications
router.post("/events/:id/create-verifications", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const result = await createVerificationRequestsForEvent(event._id);
    res.json({
      message: `Created ${result.created} verification request(s). ${result.skipped} skipped.`,
      ...result,
    });
  } catch (err) {
    console.error("Manual verification creation error:", err);
    res.status(500).json({ message: err.message ?? "Server error" });
  }
});

// ─── VERIFICATION REQUESTS OVERVIEW ─────────────────────────
// GET /api/admin/verifications
router.get("/verifications", async (req, res) => {
  try {
    const { status, faculty_id, date_from, date_to, search } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (faculty_id) filter.faculty_id = faculty_id;
    if (date_from || date_to) {
      filter.lecture_date = {};
      if (date_from) filter.lecture_date.$gte = new Date(date_from);
      if (date_to)   filter.lecture_date.$lte = new Date(date_to);
    }

    let docs = await AttendanceVerificationRequest.find(filter)
      .populate("student_id", "name userId")
      .populate({ path: "faculty_id", select: "full_name faculty_code" })
      .populate("event_id", "name")
      .sort({ created_at: -1 })
      .limit(500);

    if (search) {
      const q = search.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.student_id?.name?.toLowerCase().includes(q) ||
          d.student_id?.userId?.toLowerCase().includes(q) ||
          d.event_id?.name?.toLowerCase().includes(q)
      );
    }

    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── VERIFICATION STATS FOR ADMIN DASHBOARD ─────────────────
// GET /api/admin/verification-stats
router.get("/verification-stats", async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalPending, approvedMonth, rejectedMonth, topFaculty] = await Promise.all([
      AttendanceVerificationRequest.countDocuments({ status: "pending" }),
      AttendanceVerificationRequest.countDocuments({
        status: "approved", faculty_action_at: { $gte: startOfMonth },
      }),
      AttendanceVerificationRequest.countDocuments({
        status: "rejected", faculty_action_at: { $gte: startOfMonth },
      }),
      AttendanceVerificationRequest.aggregate([
        { $group: { _id: "$faculty_id", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: "faculties", localField: "_id", foreignField: "_id", as: "faculty" } },
        { $unwind: "$faculty" },
        { $project: { count: 1, name: "$faculty.full_name", code: "$faculty.faculty_code" } },
      ]),
    ]);

    const total = approvedMonth + rejectedMonth;
    const approvalRate = total > 0 ? Math.round((approvedMonth / total) * 100) : null;

    res.json({ totalPending, approvedMonth, rejectedMonth, approvalRate, topFaculty });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
