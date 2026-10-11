import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { upload, uploadToCloudinary } from "../middleware/upload.js";
import Club from "../models/Club.js";
import Event from "../models/Event.js";
import Institute from "../models/Institute.js";
import User from "../models/User.js";
import Registration from "../models/Registration.js";
import BudgetRequest from "../models/BudgetRequest.js";
import Venue from "../models/Venue.js";
import VenueBooking from "../models/VenueBooking.js";
import { checkConflicts } from "../services/venueConflictService.js";
import RecruitmentDrive from "../models/RecruitmentDrive.js";
import Application from "../models/Application.js";

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
// Accepts multipart/form-data with poster (file, required) + event fields.
// venue_id is optional — when given, it takes priority over the free-text
// venue field (which is derived from it server-side) and a matching
// VenueBooking is created with status "pending". Conflicts with existing
// approved bookings are returned as a warning, never as a blocking error.
router.post(
  "/events",
  upload.single("poster"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

      const {
        name, description, date, start_time, end_time,
        venue, venue_id, max_participants, registration_fee, category,
      } = req.body;

      if (!name || !description || !date || !start_time || !end_time || !max_participants || !category) {
        return res.status(400).json({ message: "All required fields must be filled" });
      }

      let venueDoc = null;
      let venueName = venue;
      if (venue_id) {
        venueDoc = await Venue.findById(venue_id);
        if (!venueDoc) return res.status(404).json({ message: "Selected venue not found" });
        venueName = venueDoc.name;
      }
      if (!venueName?.trim()) {
        return res.status(400).json({ message: "Venue is required" });
      }

      let poster_url = null;
      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer, "campusverse/posters");
        poster_url = result.url;
      }

      const eventDate = new Date(date);

      const event = await Event.create({
        name,
        description,
        date: eventDate,
        start_time,
        end_time,
        venue: venueName,
        venue_id: venueDoc?._id ?? null,
        max_participants: Number(max_participants),
        registration_fee: Number(registration_fee) || 0,
        category,
        poster_url,
        club_id: user.club_id,
        status: "pending",
        is_past_event: false,
      });

      let venueBooking = null;
      let venueConflicts = [];
      if (venueDoc) {
        venueConflicts = await checkConflicts(venueDoc._id, eventDate, start_time, end_time);
        venueBooking = await VenueBooking.create({
          venue_id:     venueDoc._id,
          booking_type: "event",
          event_id:     event._id,
          club_id:      user.club_id,
          title:        name,
          date:         eventDate,
          start_time,
          end_time,
          status:       "pending",
          created_by:   user._id,
        });
      }

      res.status(201).json({
        message: "Event submitted for approval",
        event,
        venueBooking,
        venueConflicts,
      });
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
// If venue_id, date, start_time or end_time change, the associated
// VenueBooking (if any) is kept in sync — same venue resolution and
// conflict-detection as event creation. An already-approved booking is
// reset to "pending" on such a change, since a different venue/time is
// effectively a new request that needs fresh admin review.
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

      // venue_id is optional — resolved the same way event creation does,
      // keeping the free-text `venue` field in sync with the chosen Venue.
      if (req.body.venue_id !== undefined) {
        if (req.body.venue_id) {
          const venueDoc = await Venue.findById(req.body.venue_id);
          if (!venueDoc) return res.status(404).json({ message: "Selected venue not found" });
          updates.venue_id = venueDoc._id;
          updates.venue = venueDoc.name;
        } else {
          updates.venue_id = null;
        }
      }

      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer, "campusverse/posters");
        updates.poster_url = result.url;
      }

      const updated = await Event.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true }
      );

      // ── Sync the associated VenueBooking, if this event has one ──────
      let venueBooking = null;
      let venueConflicts = [];
      const booking = await VenueBooking.findOne({ event_id: updated._id });

      if (booking) {
        if (!updated.venue_id) {
          // Venue was unlinked entirely (back to free-text only) — this
          // booking no longer represents a real request, so it's
          // cancelled rather than left stale/dangling.
          if (booking.status !== "cancelled") {
            venueBooking = await VenueBooking.findByIdAndUpdate(booking._id, { status: "cancelled" }, { new: true });
          } else {
            venueBooking = booking;
          }
        } else {
          const venueChanged = req.body.venue_id !== undefined && String(booking.venue_id) !== String(updated.venue_id);
          const dateChanged  = req.body.date !== undefined && booking.date.getTime() !== updated.date.getTime();
          const startChanged = req.body.start_time !== undefined && booking.start_time !== updated.start_time;
          const endChanged   = req.body.end_time !== undefined && booking.end_time !== updated.end_time;

          if (venueChanged || dateChanged || startChanged || endChanged) {
            const bookingUpdates = {
              venue_id:   updated.venue_id,
              title:      updated.name,
              date:       updated.date,
              start_time: updated.start_time,
              end_time:   updated.end_time,
            };
            if (booking.status === "approved") bookingUpdates.status = "pending";

            venueBooking = await VenueBooking.findByIdAndUpdate(booking._id, bookingUpdates, { new: true });
            venueConflicts = await checkConflicts(updated.venue_id, updated.date, updated.start_time, updated.end_time, booking._id);
          } else {
            venueBooking = booking;
          }
        }
      }

      res.json({ message: "Event updated", event: updated, venueBooking, venueConflicts });
    } catch (err) {
      console.error("Edit event error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ─── GET EVENTS FOR SCANNER (approved, happening now or soon) ─
// GET /api/club/events/scanner-list
router.get("/events/scanner-list", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const events = await Event.find({
      club_id: user.club_id,
      status:  "approved",
      date:    { $gte: twoDaysAgo },
    }).sort({ date: 1 }).select("name date start_time end_time venue");

    res.json(events);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── GET EVENT ATTENDEES ─────────────────────────────────────
// GET /api/club/events/:id/attendees
router.get("/events/:id/attendees", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const event = await Event.findOne({ _id: req.params.id, club_id: user.club_id });
    if (!event) return res.status(404).json({ message: "Event not found" });

    const registrations = await Registration.find({ event_id: event._id })
      .populate("student_id", "name userId email")
      .sort({ registered_at: 1 });

    const attendees = registrations.map((r) => ({
      registration_id:   r._id,
      student_name:      r.student_id?.name    ?? "Unknown",
      student_prn:       r.student_id?.userId  ?? "",
      student_email:     r.student_id?.email   ?? "",
      registered_at:     r.registered_at,
      attendance_status: r.attendance_status,
      entry_scanned:     r.entry_scanned,
      entry_scanned_at:  r.entry_scanned_at,
      exit_scanned:      r.exit_scanned,
      exit_scanned_at:   r.exit_scanned_at,
      duration_minutes:  r.duration_minutes,
    }));

    const stats = {
      total:          registrations.length,
      entry_scanned:  registrations.filter((r) => r.entry_scanned).length,
      exit_scanned:   registrations.filter((r) => r.exit_scanned).length,
      full_attendance: registrations.filter((r) => r.attendance_status === "full").length,
      partial:        registrations.filter((r) => r.attendance_status === "partial").length,
    };

    res.json({ event, attendees, stats });
  } catch (err) {
    console.error("Get attendees error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

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

// ═══════════════════════════════════════════════════════════
// VENUES
// ═══════════════════════════════════════════════════════════

// ─── ACTIVE VENUES (for event creation dropdown) ─────────────
// GET /api/club/venues
router.get("/venues", async (req, res) => {
  try {
    const venues = await Venue.find({ is_active: true }).sort({ name: 1 });
    res.json(venues);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── VENUE AVAILABILITY FOR A GIVEN DATE ─────────────────────
// GET /api/club/venues/:id/availability?date=
router.get("/venues/:id/availability", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "date is required" });

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const bookings = await VenueBooking.find({
      venue_id: req.params.id,
      date:     { $gte: dayStart, $lt: dayEnd },
      status:   "approved",
    })
      .populate("club_id", "name")
      .populate("event_id", "name")
      .sort({ start_time: 1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── OWN VENUE BOOKINGS (for showing booking status on events) ─
// GET /api/club/venue-bookings
// Not in the original A4 list — added because B4 (showing the club its
// own booking status: pending/approved/rejected) has no way to get that
// otherwise; VenueBooking.status lives only on this document, not on Event.
router.get("/venue-bookings", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

    const bookings = await VenueBooking.find({ club_id: user.club_id })
      .populate("venue_id", "name venue_type")
      .populate("event_id", "name date")
      .sort({ created_at: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ═══════════════════════════════════════════════════════════
// BUDGET REQUESTS
// ═══════════════════════════════════════════════════════════

// ─── CREATE BUDGET REQUEST ────────────────────────────────────
// POST /api/club/budget-requests
router.post("/budget-requests", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

    const {
      title, request_type, event_id, amount_requested,
      purpose, breakdown, academic_year,
    } = req.body;

    if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
    if (!["annual", "event"].includes(request_type)) {
      return res.status(400).json({ message: "request_type must be 'annual' or 'event'" });
    }
    const amount = Number(amount_requested);
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "amount_requested must be greater than 0" });
    }
    if (!purpose?.trim()) return res.status(400).json({ message: "Purpose is required" });
    if (!academic_year?.trim()) return res.status(400).json({ message: "academic_year is required" });

    let eventDoc = null;
    if (request_type === "event") {
      if (!event_id) return res.status(400).json({ message: "event_id is required when request_type is 'event'" });
      eventDoc = await Event.findOne({ _id: event_id, club_id: user.club_id });
      if (!eventDoc) return res.status(404).json({ message: "Event not found for your club" });
    }

    const parsedBreakdown = Array.isArray(breakdown)
      ? breakdown
          .filter((b) => b?.item?.trim() && b?.cost != null)
          .map((b) => ({ item: b.item.trim(), cost: Number(b.cost) }))
      : [];

    const budgetRequest = await BudgetRequest.create({
      club_id:           user.club_id,
      requested_by:      user._id,
      title:             title.trim(),
      request_type,
      event_id:          request_type === "event" ? eventDoc._id : null,
      amount_requested:  amount,
      purpose:           purpose.trim(),
      breakdown:         parsedBreakdown,
      academic_year:     academic_year.trim(),
    });

    res.status(201).json({ message: "Budget request submitted", budgetRequest });
  } catch (err) {
    console.error("Create budget request error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ─── LIST OWN BUDGET REQUESTS ─────────────────────────────────
// GET /api/club/budget-requests?status=
router.get("/budget-requests", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

    const { status } = req.query;
    const filter = { club_id: user.club_id };
    if (status && status !== "all") filter.status = status;

    const requests = await BudgetRequest.find(filter)
      .populate("event_id", "name date")
      .populate("requested_by", "userId email")
      .sort({ created_at: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── SINGLE BUDGET REQUEST DETAIL ─────────────────────────────
// GET /api/club/budget-requests/:id
router.get("/budget-requests/:id", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

    const budgetRequest = await BudgetRequest.findOne({ _id: req.params.id, club_id: user.club_id })
      .populate("event_id", "name date")
      .populate("requested_by", "userId email")
      .populate("actioned_by", "userId email");

    if (!budgetRequest) return res.status(404).json({ message: "Budget request not found" });
    res.json(budgetRequest);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── EDIT BUDGET REQUEST (only if pending) ───────────────────
// PATCH /api/club/budget-requests/:id
// request_type is immutable after creation — switching between "annual"
// and "event" changes what the request fundamentally represents, so it's
// simpler and safer to require a new request for that instead.
router.patch("/budget-requests/:id", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

    const budgetRequest = await BudgetRequest.findOne({ _id: req.params.id, club_id: user.club_id });
    if (!budgetRequest) return res.status(404).json({ message: "Budget request not found" });
    if (budgetRequest.status !== "pending") {
      return res.status(400).json({ message: "Only pending requests can be edited" });
    }

    const { title, amount_requested, purpose, breakdown, academic_year, event_id } = req.body;
    const updates = {};

    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ message: "Title cannot be empty" });
      updates.title = title.trim();
    }
    if (amount_requested !== undefined) {
      const amount = Number(amount_requested);
      if (!amount || amount <= 0) return res.status(400).json({ message: "amount_requested must be greater than 0" });
      updates.amount_requested = amount;
    }
    if (purpose !== undefined) {
      if (!purpose.trim()) return res.status(400).json({ message: "Purpose cannot be empty" });
      updates.purpose = purpose.trim();
    }
    if (academic_year !== undefined) {
      if (!academic_year.trim()) return res.status(400).json({ message: "academic_year cannot be empty" });
      updates.academic_year = academic_year.trim();
    }
    if (Array.isArray(breakdown)) {
      updates.breakdown = breakdown
        .filter((b) => b?.item?.trim() && b?.cost != null)
        .map((b) => ({ item: b.item.trim(), cost: Number(b.cost) }));
    }
    if (event_id !== undefined) {
      if (budgetRequest.request_type !== "event") {
        return res.status(400).json({ message: "event_id can only be set on an event-type request" });
      }
      const eventDoc = await Event.findOne({ _id: event_id, club_id: user.club_id });
      if (!eventDoc) return res.status(404).json({ message: "Event not found for your club" });
      updates.event_id = eventDoc._id;
    }

    const updated = await BudgetRequest.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    ).populate("event_id", "name date");

    res.json({ message: "Budget request updated", budgetRequest: updated });
  } catch (err) {
    console.error("Update budget request error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ─── WITHDRAW BUDGET REQUEST (only if pending) ───────────────
// DELETE /api/club/budget-requests/:id
// Sets status to "withdrawn" rather than deleting, so there's an audit
// trail — scoped to status "pending" so it can't race with an admin
// approving/rejecting the same request at the same time.
router.delete("/budget-requests/:id", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

    const updated = await BudgetRequest.findOneAndUpdate(
      { _id: req.params.id, club_id: user.club_id, status: "pending" },
      { status: "withdrawn" },
      { new: true }
    );

    if (!updated) {
      const exists = await BudgetRequest.exists({ _id: req.params.id, club_id: user.club_id });
      return res.status(exists ? 400 : 404).json({
        message: exists ? "Only pending requests can be withdrawn" : "Budget request not found",
      });
    }

    res.json({ message: "Budget request withdrawn", budgetRequest: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ═══════════════════════════════════════════════════════════
// RECRUITMENT
// ═══════════════════════════════════════════════════════════

// Legal forward flow: applied → shortlisted → interview_scheduled →
// interviewed → selected, one step at a time. "rejected" is reachable
// from any non-terminal stage — not every applicant needs to be
// shortlisted before being turned down. interview_scheduled and
// interviewed are only reachable via their own dedicated endpoints
// (they require slot/feedback payloads the generic stage endpoint
// doesn't take), never via PATCH .../stage directly.
const STAGE_FLOW = ["applied", "shortlisted", "interview_scheduled", "interviewed", "selected"];
const TERMINAL_STAGES = ["selected", "rejected"];

function canAdvanceTo(currentStage, targetStage) {
  if (TERMINAL_STAGES.includes(currentStage)) return false;
  if (targetStage === "rejected") return true;
  const currentIdx = STAGE_FLOW.indexOf(currentStage);
  const targetIdx  = STAGE_FLOW.indexOf(targetStage);
  return currentIdx !== -1 && targetIdx === currentIdx + 1;
}

async function appendStageHistory(applicationId, stage, userId, note) {
  await Application.findByIdAndUpdate(applicationId, {
    $push: { stage_history: { stage, changed_by: userId, changed_at: new Date(), note: note?.trim() || null } },
  });
}

// ─── DRIVES — CRUD ────────────────────────────────────────────
// POST /api/club/recruitment-drives
router.post("/recruitment-drives", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

    const { title, description, roles_open, questions, application_deadline, status } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
    if (!application_deadline) return res.status(400).json({ message: "application_deadline is required" });

    const drive = await RecruitmentDrive.create({
      club_id:     user.club_id,
      title:       title.trim(),
      description: description?.trim() || null,
      roles_open:  Array.isArray(roles_open) ? roles_open.filter((r) => r?.trim()).map((r) => r.trim()) : [],
      questions:   Array.isArray(questions)
        ? questions.filter((q) => q?.question?.trim()).map((q) => ({ question: q.question.trim(), required: !!q.required }))
        : [],
      application_deadline: new Date(application_deadline),
      status: ["draft", "open", "closed"].includes(status) ? status : "draft",
      created_by: user._id,
    });

    res.status(201).json({ message: "Recruitment drive created", drive });
  } catch (err) {
    console.error("Create drive error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/club/recruitment-drives
router.get("/recruitment-drives", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.club_id) return res.status(404).json({ message: "Club not found" });
    const drives = await RecruitmentDrive.find({ club_id: user.club_id }).sort({ created_at: -1 });
    res.json(drives);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/club/recruitment-drives/:id
router.get("/recruitment-drives/:id", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.club_id) return res.status(404).json({ message: "Club not found" });
    const drive = await RecruitmentDrive.findOne({ _id: req.params.id, club_id: user.club_id });
    if (!drive) return res.status(404).json({ message: "Recruitment drive not found" });
    res.json(drive);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/club/recruitment-drives/:id
router.patch("/recruitment-drives/:id", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

    const drive = await RecruitmentDrive.findOne({ _id: req.params.id, club_id: user.club_id });
    if (!drive) return res.status(404).json({ message: "Recruitment drive not found" });

    const { title, description, roles_open, questions, application_deadline, status } = req.body;
    const updates = {};
    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ message: "Title cannot be empty" });
      updates.title = title.trim();
    }
    if (description !== undefined)  updates.description = description?.trim() || null;
    if (roles_open !== undefined)   updates.roles_open = Array.isArray(roles_open) ? roles_open.filter((r) => r?.trim()).map((r) => r.trim()) : [];
    if (questions !== undefined) {
      updates.questions = Array.isArray(questions)
        ? questions.filter((q) => q?.question?.trim()).map((q) => ({ question: q.question.trim(), required: !!q.required }))
        : [];
    }
    if (application_deadline !== undefined) updates.application_deadline = new Date(application_deadline);
    if (status !== undefined) {
      if (!["draft", "open", "closed"].includes(status)) return res.status(400).json({ message: "Invalid status" });
      updates.status = status;
    }

    const updated = await RecruitmentDrive.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    res.json({ message: "Recruitment drive updated", drive: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/club/recruitment-drives/:id — only if it has no applications yet
router.delete("/recruitment-drives/:id", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

    const drive = await RecruitmentDrive.findOne({ _id: req.params.id, club_id: user.club_id });
    if (!drive) return res.status(404).json({ message: "Recruitment drive not found" });

    const hasApplications = await Application.exists({ drive_id: drive._id });
    if (hasApplications) {
      return res.status(409).json({ message: "Cannot delete: this drive already has applications. Close it instead." });
    }

    await RecruitmentDrive.findByIdAndDelete(req.params.id);
    res.json({ message: "Recruitment drive deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── APPLICATIONS ──────────────────────────────────────────────
// GET /api/club/applications?drive_id=&stage=
router.get("/applications", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

    const { drive_id, stage } = req.query;
    const filter = { club_id: user.club_id };
    if (drive_id) filter.drive_id = drive_id;
    if (stage && stage !== "all") filter.stage = stage;

    const applications = await Application.find(filter)
      .populate("student_id", "name userId email mobile")
      .populate("drive_id", "title")
      .sort({ created_at: -1 });

    res.json(applications);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/club/applications/:id
router.get("/applications/:id", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

    const application = await Application.findOne({ _id: req.params.id, club_id: user.club_id })
      .populate("student_id", "name userId email mobile")
      .populate("drive_id", "title questions")
      .populate("stage_history.changed_by", "userId email")
      .populate("interview_feedback.recorded_by", "userId email");

    if (!application) return res.status(404).json({ message: "Application not found" });
    res.json(application);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── ADVANCE / REJECT / SELECT ────────────────────────────────
// PATCH /api/club/applications/:id/stage
// Body: { stage: "shortlisted" | "rejected" | "selected", note? }
router.patch("/applications/:id/stage", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

    const { stage, note } = req.body;
    if (!["shortlisted", "rejected", "selected"].includes(stage)) {
      return res.status(400).json({
        message: "stage must be 'shortlisted', 'rejected' or 'selected' — use the dedicated endpoints to schedule an interview or record feedback",
      });
    }

    const application = await Application.findOne({ _id: req.params.id, club_id: user.club_id });
    if (!application) return res.status(404).json({ message: "Application not found" });

    if (!canAdvanceTo(application.stage, stage)) {
      return res.status(400).json({ message: `Cannot move from '${application.stage}' to '${stage}'` });
    }

    const updates = { stage };
    if (stage === "rejected" || stage === "selected") {
      updates.final_remarks = note?.trim() || null;
    }

    const updated = await Application.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    await appendStageHistory(updated._id, stage, user._id, note);

    res.json({ message: "Application updated", application: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── BULK SHORTLIST ────────────────────────────────────────────
// POST /api/club/applications/bulk-shortlist
// Body: { ids: [applicationId, ...] } — only applications currently in
// "applied" are eligible; others are silently skipped and reported.
router.post("/applications/bulk-shortlist", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "ids array required" });

    const applications = await Application.find({ _id: { $in: ids }, club_id: user.club_id });
    const eligibleIds = applications.filter((a) => canAdvanceTo(a.stage, "shortlisted")).map((a) => a._id);

    if (eligibleIds.length > 0) {
      await Application.updateMany({ _id: { $in: eligibleIds } }, { $set: { stage: "shortlisted" } });
      await Application.updateMany(
        { _id: { $in: eligibleIds } },
        { $push: { stage_history: { stage: "shortlisted", changed_by: user._id, changed_at: new Date(), note: "Bulk shortlisted" } } }
      );
    }

    res.json({
      message:     `Shortlisted ${eligibleIds.length} of ${ids.length} application(s)`,
      shortlisted: eligibleIds.length,
      skipped:     ids.length - eligibleIds.length,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── SCHEDULE INTERVIEW ────────────────────────────────────────
// PATCH /api/club/applications/:id/schedule-interview
// Body: { date, time, venue?, meeting_link?, note? } — venue or
// meeting_link (at least one) required. Only legal from "shortlisted".
router.patch("/applications/:id/schedule-interview", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

    const { date, time, venue, meeting_link, note } = req.body;
    if (!date || !time) return res.status(400).json({ message: "date and time are required" });
    if (!venue?.trim() && !meeting_link?.trim()) {
      return res.status(400).json({ message: "Provide a venue or a meeting link" });
    }

    const application = await Application.findOne({ _id: req.params.id, club_id: user.club_id });
    if (!application) return res.status(404).json({ message: "Application not found" });

    if (!canAdvanceTo(application.stage, "interview_scheduled")) {
      return res.status(400).json({ message: `Cannot schedule an interview from stage '${application.stage}' — the application must be shortlisted first` });
    }

    const updated = await Application.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          stage: "interview_scheduled",
          interview_slot: {
            date: new Date(date), time,
            venue: venue?.trim() || null,
            meeting_link: meeting_link?.trim() || null,
          },
        },
      },
      { new: true }
    );
    await appendStageHistory(updated._id, "interview_scheduled", user._id, note);

    res.json({ message: "Interview scheduled", application: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── RECORD INTERVIEW FEEDBACK ─────────────────────────────────
// PATCH /api/club/applications/:id/feedback
// Body: { rating (1-5), notes?, note? } — internal only, never shown to
// the student. Only legal from "interview_scheduled".
router.patch("/applications/:id/feedback", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.club_id) return res.status(404).json({ message: "Club not found" });

    const { rating, notes, note } = req.body;
    if (rating === undefined || rating === null || rating === "") {
      return res.status(400).json({ message: "rating is required" });
    }
    const numericRating = Number(rating);
    if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "rating must be a number between 1 and 5" });
    }

    const application = await Application.findOne({ _id: req.params.id, club_id: user.club_id });
    if (!application) return res.status(404).json({ message: "Application not found" });

    if (!canAdvanceTo(application.stage, "interviewed")) {
      return res.status(400).json({ message: `Cannot record feedback from stage '${application.stage}' — the interview must be scheduled first` });
    }

    const updated = await Application.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          stage: "interviewed",
          interview_feedback: {
            rating: numericRating,
            notes:  notes?.trim() || null,
            recorded_by: user._id,
            recorded_at: new Date(),
          },
        },
      },
      { new: true }
    );
    await appendStageHistory(updated._id, "interviewed", user._id, note);

    res.json({ message: "Feedback recorded", application: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
