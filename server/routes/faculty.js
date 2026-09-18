import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import Faculty  from "../models/Faculty.js";
import Division from "../models/Division.js";
import AttendanceVerificationRequest from "../models/AttendanceVerificationRequest.js";
import User from "../models/User.js";
import { sendPushNotification } from "../services/pushNotificationService.js";

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

    // Students in the division(s) this faculty is class teacher of
    const divisionIds = await Division.find({ class_teacher_id: faculty._id }).distinct("_id");
    const totalStudents = await User.countDocuments({
      role: "student",
      division_id: { $in: divisionIds },
    });

    res.json({ pending, approvedMonth, rejectedMonth, totalStudents });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ── GET /api/faculty/verifications ───────────────────────────
// Query: status, event_id, date_from, date_to, search (student name)
router.get("/verifications", async (req, res) => {
  try {
    const faculty = await getFaculty(req);
    const { status = "pending", event_id, date_from, date_to, search } = req.query;

    const filter = { faculty_id: faculty._id };
    if (status !== "all") filter.status = status;
    if (event_id)  filter.event_id = event_id;
    if (date_from || date_to) {
      filter.event_date = {};
      if (date_from) filter.event_date.$gte = new Date(date_from);
      if (date_to)   filter.event_date.$lte = new Date(date_to);
    }

    let query = AttendanceVerificationRequest.find(filter)
      .populate("student_id", "name userId division_id")
      .populate({ path: "student_id", populate: { path: "division_id", select: "name year" } })
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

    sendPushNotification(
      avr.student_id,
      "OD Approved",
      `Your OD for ${avr.event_name} was approved.`,
      { type: "verification_decision" }
    ).catch(() => {});

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

    sendPushNotification(
      avr.student_id,
      "OD Rejected",
      `Your OD for ${avr.event_name} was rejected.`,
      { type: "verification_decision" }
    ).catch(() => {});

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

// ── GET /api/faculty/my-division ─────────────────────────────
// The division(s) this faculty is class teacher of.
router.get("/my-division", async (req, res) => {
  try {
    const faculty = await getFaculty(req);
    const divisions = await Division.find({ class_teacher_id: faculty._id })
      .populate({ path: "department_id", select: "name code institute_id", populate: { path: "institute_id", select: "name code" } });
    res.json(divisions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
