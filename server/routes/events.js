import express from "express";
import mongoose from "mongoose";
import jwt      from "jsonwebtoken";
import QRCode   from "qrcode";
import Registration from "../models/Registration.js";
import Event        from "../models/Event.js";
import User         from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { uploadToCloudinary } from "../middleware/upload.js";

const router = express.Router();

// ─── REGISTER FOR EVENT ──────────────────────────────────────
// POST /api/events/:id/register  (student auth required)
router.post("/:id/register", verifyToken, requireRole("student"), async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Invalid session" });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.status !== "approved") {
      return res.status(400).json({ message: "This event is not open for registration" });
    }
    if (new Date(event.date) < new Date()) {
      return res.status(400).json({ message: "This event has already ended" });
    }

    // Check if already registered
    const existing = await Registration.findOne({
      student_id: req.user.id,
      event_id:   event._id,
    });
    if (existing) return res.status(409).json({ message: "You are already registered for this event" });

    // Check capacity
    const registrationCount = await Registration.countDocuments({ event_id: event._id });
    if (registrationCount >= event.max_participants) {
      return res.status(400).json({ message: "This event is full" });
    }

    const reg = await Registration.create({
      student_id: req.user.id,
      event_id:   event._id,
    });

    // ── Generate QR code asynchronously — don't block the response ──
    setImmediate(async () => {
      try {
        const payload = {
          registration_id: reg._id.toString(),
          student_id:      req.user.id.toString(),
          event_id:        event._id.toString(),
          timestamp:       Date.now(),
        };
        const qrToken = jwt.sign(payload, process.env.QR_SECRET, { expiresIn: "365d" });

        const qrBuffer = await QRCode.toBuffer(qrToken, {
          type:          "png",
          width:         400,
          margin:        2,
          color:         { dark: "#1a1a2e", light: "#ffffff" },
          errorCorrectionLevel: "H",
        });

        const { url } = await uploadToCloudinary(qrBuffer, "campusverse/qrcodes");
        await Registration.findByIdAndUpdate(reg._id, { qr_code_path: url, qr_token: qrToken });
      } catch (qrErr) {
        console.error("QR generation failed for reg", reg._id, qrErr.message);
      }
    });

    res.status(201).json({ message: "Registered successfully!", registration: reg });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "You are already registered for this event" });
    }
    console.error("Register event error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ─── CANCEL REGISTRATION ─────────────────────────────────────
// DELETE /api/events/:id/register  (student auth required)
router.delete("/:id/register", verifyToken, requireRole("student"), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (new Date(event.date) <= new Date()) {
      return res.status(400).json({ message: "Cannot cancel after the event date" });
    }

    const result = await Registration.findOneAndDelete({
      student_id: req.user.id,
      event_id:   event._id,
    });
    if (!result) return res.status(404).json({ message: "Registration not found" });

    res.json({ message: "Registration cancelled" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── CHECK REGISTRATION STATUS ───────────────────────────────
// GET /api/events/:id/is-registered  (auth required)
router.get("/:id/is-registered", verifyToken, async (req, res) => {
  try {
    const existing = await Registration.findOne({
      student_id: req.user.id,
      event_id:   req.params.id,
    });
    res.json({ isRegistered: !!existing });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
