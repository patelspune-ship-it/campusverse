import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { upload, uploadToCloudinary } from "../middleware/upload.js";
import Club from "../models/Club.js";
import Event from "../models/Event.js";
import Institute from "../models/Institute.js";
import User from "../models/User.js";

const router = express.Router();

// All routes in this group require a valid JWT + club_admin role
router.use(verifyToken, requireRole("club_admin"));

// ─── HEALTH CHECK ────────────────────────────────────────────
router.get("/ping", (req, res) => {
  res.json({ message: "Club admin route accessible", user: req.user });
});

// ─── GET CURRENT CLUB + USER DATA ───────────────────────────
// GET /api/club/me
router.get("/me", async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const club = await Club.findById(user.club_id).populate("institute_id", "name code");
    if (!club) return res.status(404).json({ message: "Club not found" });

    res.json({ user, club });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── GET ALL INSTITUTES (for profile dropdown) ───────────────
// GET /api/club/institutes
router.get("/institutes", async (req, res) => {
  try {
    const institutes = await Institute.find().sort({ name: 1 }).select("_id name code");
    res.json(institutes);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── UPDATE CLUB PROFILE ─────────────────────────────────────
// PATCH /api/club/profile
// Accepts multipart/form-data with optional fields: logo, banner (files) +
// category, description, founded_year, institute_id, instagram_handle,
// linkedin_url, club_email (text fields)
router.patch(
  "/profile",
  upload.fields([
    { name: "logo",   maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

      const updates = {};

      // Text fields — only update if provided
      const textFields = [
        "category", "description", "founded_year",
        "institute_id", "instagram_handle", "linkedin_url", "club_email",
      ];
      for (const field of textFields) {
        if (req.body[field] !== undefined && req.body[field] !== "") {
          updates[field] = field === "founded_year"
            ? Number(req.body[field])
            : req.body[field];
        }
      }

      // Handle null institute_id (university-wide)
      if (req.body.institute_id === "null" || req.body.institute_id === "") {
        updates.institute_id = null;
      }

      // Upload logo if provided
      if (req.files?.logo?.[0]) {
        const result = await uploadToCloudinary(req.files.logo[0].buffer, "campusverse/logos");
        updates.logo_url = result.url;
      }

      // Upload banner if provided
      if (req.files?.banner?.[0]) {
        const result = await uploadToCloudinary(req.files.banner[0].buffer, "campusverse/banners");
        updates.banner_url = result.url;
      }

      // Check if profile is now complete
      const club = await Club.findById(user.club_id);
      const merged = { ...club.toObject(), ...updates };
      const isComplete = !!(
        merged.category &&
        merged.description &&
        merged.logo_url
      );
      updates.profile_completed = isComplete;

      const updatedClub = await Club.findByIdAndUpdate(
        user.club_id,
        { $set: updates },
        { new: true }
      ).populate("institute_id", "name code");

      res.json({ message: "Profile updated successfully", club: updatedClub });
    } catch (err) {
      console.error("Profile update error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ─── GET CLUB EVENTS ─────────────────────────────────────────
// GET /api/club/events
router.get("/events", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

    const events = await Event.find({ club_id: user.club_id }).sort({ created_at: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── CREATE EVENT ─────────────────────────────────────────────
// POST /api/club/events
// Accepts multipart/form-data with poster (file, required) + event fields
router.post(
  "/events",
  upload.single("poster"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

      const {
        name, description, date, start_time, end_time,
        venue, max_participants, registration_fee, category,
      } = req.body;

      if (!name || !description || !date || !start_time || !end_time || !venue || !max_participants || !category) {
        return res.status(400).json({ message: "All required fields must be filled" });
      }

      let poster_url = null;
      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer, "campusverse/posters");
        poster_url = result.url;
      }

      const event = await Event.create({
        name,
        description,
        date: new Date(date),
        start_time,
        end_time,
        venue,
        max_participants: Number(max_participants),
        registration_fee: Number(registration_fee) || 0,
        category,
        poster_url,
        club_id: user.club_id,
        status: "pending",
        is_past_event: false,
      });

      res.status(201).json({ message: "Event submitted for approval", event });
    } catch (err) {
      console.error("Create event error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ─── CREATE PAST EVENT ────────────────────────────────────────
// POST /api/club/events/past
router.post(
  "/events/past",
  upload.single("poster"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

      const {
        name, description, date, start_time, end_time,
        venue, max_participants, registration_fee, category,
        past_event_attendees_count, past_event_summary,
      } = req.body;

      if (!name || !description || !date || !start_time || !end_time || !venue || !max_participants || !category) {
        return res.status(400).json({ message: "All required fields must be filled" });
      }

      // Validate past date
      if (new Date(date) >= new Date()) {
        return res.status(400).json({ message: "Past event date must be in the past" });
      }

      let poster_url = null;
      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer, "campusverse/posters");
        poster_url = result.url;
      }

      const event = await Event.create({
        name,
        description,
        date: new Date(date),
        start_time,
        end_time,
        venue,
        max_participants: Number(max_participants),
        registration_fee: Number(registration_fee) || 0,
        category,
        poster_url,
        club_id: user.club_id,
        status: "completed",
        is_past_event: true,
        past_event_attendees_count: Number(past_event_attendees_count) || null,
        past_event_summary: past_event_summary || null,
      });

      res.status(201).json({ message: "Past event added successfully", event });
    } catch (err) {
      console.error("Add past event error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ─── EDIT EVENT (only if pending) ────────────────────────────
// PATCH /api/club/events/:id
router.patch(
  "/events/:id",
  upload.single("poster"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      const event = await Event.findOne({ _id: req.params.id, club_id: user.club_id });

      if (!event) return res.status(404).json({ message: "Event not found" });
      if (event.status !== "pending") {
        return res.status(400).json({ message: "Only pending events can be edited" });
      }

      const updates = { ...req.body };
      if (req.body.date) updates.date = new Date(req.body.date);
      if (req.body.max_participants) updates.max_participants = Number(req.body.max_participants);
      if (req.body.registration_fee !== undefined) updates.registration_fee = Number(req.body.registration_fee);

      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer, "campusverse/posters");
        updates.poster_url = result.url;
      }

      const updated = await Event.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true }
      );
      res.json({ message: "Event updated", event: updated });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ─── CANCEL EVENT ─────────────────────────────────────────────
// PATCH /api/club/events/:id/cancel
router.patch("/events/:id/cancel", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const event = await Event.findOne({ _id: req.params.id, club_id: user.club_id });

    if (!event) return res.status(404).json({ message: "Event not found" });
    if (["completed", "cancelled"].includes(event.status)) {
      return res.status(400).json({ message: "Cannot cancel this event" });
    }

    event.status = "cancelled";
    await event.save();
    res.json({ message: "Event cancelled", event });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
