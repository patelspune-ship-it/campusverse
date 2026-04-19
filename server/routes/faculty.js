import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import Faculty   from "../models/Faculty.js";
import Timetable from "../models/Timetable.js";
import AttendanceVerificationRequest from "../models/AttendanceVerificationRequest.js";
import User from "../models/User.js";

const router = express.Router();
router.use(verifyToken, requireRole("faculty"));

// Helper — get Faculty doc for the logged-in user (cached per request)
async function getFaculty(req) {
  if (req.faculty) return req.faculty;
  const f = await Faculty.findOne({ user_id: req.user.id });
  if (!f) throw Object.assign(new Error("Faculty profile not found"), { status: 404 });
  req.faculty = f;
  return f;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ── GET /api/faculty/stats ────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const faculty = await getFaculty(req);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [pending, approvedMonth, rejectedMonth] = await Promise.all([
      AttendanceVerificationRequest.countDocuments({ faculty_id: faculty._id, status: "pending" }),
      AttendanceVerificationRequest.countDocuments({
        faculty_id: faculty._id, status: "approved",
        faculty_action_at: { $gte: startOfMonth },
      }),
      AttendanceVerificationRequest.countDocuments({
        faculty_id: faculty._id, status: "rejected",
        faculty_action_at: { $gte: startOfMonth },
      }),
    ]);

    // Distinct students taught via timetable slots
    const slots = await Timetable.find({ faculty_id: faculty._id }).distinct("division_id");
    const totalStudents = await User.countDocuments({
      role: "student",
      division_id: { $in: slots },
    });

    res.json({ pending, approvedMonth, rejectedMonth, totalStudents });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ── GET /api/faculty/verifications ───────────────────────────
// Query: status, subject, event_id, date_from, date_to, search (student name)
router.get("/verifications", async (req, res) => {
  try {
    const faculty = await getFaculty(req);
    const { status = "pending", subject, event_id, date_from, date_to, search } = req.query;

    const filter = { faculty_id: faculty._id };
    if (status !== "all") filter.status = status;
    if (subject)   filter.subject_name = new RegExp(subject, "i");
    if (event_id)  filter.event_id = event_id;
    if (date_from || date_to) {
      filter.lecture_date = {};
      if (date_from) filter.lecture_date.$gte = new Date(date_from);
      if (date_to)   filter.lecture_date.$lte = new Date(date_to);
    }

    let query = AttendanceVerificationRequest.find(filter)
      .populate("student_id", "name userId division_id")
      .populate({ path: "student_id", populate: { path: "division_id", select: "division_code year" } })
      .populate("event_id", "name club_id")
      .populate({ path: "event_id", populate: { path: "club_id", select: "name" } })
      .sort({ created_at: -1 })
      .limit(200);

    let results = await query;

    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (r) =>
          r.student_id?.name?.toLowerCase().includes(q) ||
          r.student_id?.userId?.toLowerCase().includes(q)
      );
    }

    res.json(results);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ── GET /api/faculty/verifications/:id ───────────────────────
router.get("/verifications/:id", async (req, res) => {
  try {
    const faculty = await getFaculty(req);
    const avr = await AttendanceVerificationRequest.findOne({
      _id: req.params.id, faculty_id: faculty._id,
    })
      .populate("student_id", "name userId email")
      .populate("event_id", "name date venue club_id")
      .populate({ path: "event_id", populate: { path: "club_id", select: "name" } });

    if (!avr) return res.status(404).json({ message: "Request not found" });
    res.json(avr);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/faculty/verifications/:id/approve ─────────────
router.patch("/verifications/:id/approve", async (req, res) => {
  try {
    const faculty = await getFaculty(req);
    const avr = await AttendanceVerificationRequest.findOneAndUpdate(
      { _id: req.params.id, faculty_id: faculty._id, status: "pending" },
      { status: "approved", faculty_action_at: new Date() },
      { new: true }
    );
    if (!avr) return res.status(404).json({ message: "Request not found or already actioned" });
    res.json({ message: "Approved", avr });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/faculty/verifications/:id/reject ──────────────
router.patch("/verifications/:id/reject", async (req, res) => {
  try {
    const faculty = await getFaculty(req);
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ message: "Rejection reason is required" });

    const avr = await AttendanceVerificationRequest.findOneAndUpdate(
      { _id: req.params.id, faculty_id: faculty._id, status: "pending" },
      { status: "rejected", rejection_reason: reason.trim(), faculty_action_at: new Date() },
      { new: true }
    );
    if (!avr) return res.status(404).json({ message: "Request not found or already actioned" });
    res.json({ message: "Rejected", avr });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/faculty/verifications/bulk-approve ─────────────
router.post("/verifications/bulk-approve", async (req, res) => {
  try {
    const faculty = await getFaculty(req);
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: "ids array required" });

    const result = await AttendanceVerificationRequest.updateMany(
      { _id: { $in: ids }, faculty_id: faculty._id, status: "pending" },
      { status: "approved", faculty_action_at: new Date() }
    );
    res.json({ message: `Approved ${result.modifiedCount} request(s)`, count: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/faculty/timetable ───────────────────────────────
router.get("/timetable", async (req, res) => {
  try {
    const faculty = await getFaculty(req);
    const slots = await Timetable.find({ faculty_id: faculty._id, slot_type: "lecture" })
      .populate("division_id", "division_code year department semester")
      .sort({ day: 1, start_time: 1 });
    res.json(slots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/faculty/today-schedule ──────────────────────────
router.get("/today-schedule", async (req, res) => {
  try {
    const faculty  = await getFaculty(req);
    const DAYS_ARR = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today    = DAYS_ARR[new Date().getDay()];

    const slots = await Timetable.find({
      faculty_id: faculty._id, day: today, slot_type: "lecture",
    })
      .populate("division_id", "division_code year department")
      .sort({ start_time: 1 });

    res.json(slots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
