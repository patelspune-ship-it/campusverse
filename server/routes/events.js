import express from "express";
import Registration from "../models/Registration.js";
import Event from "../models/Event.js";

const router = express.Router();

// Register for event
router.post("/register", async (req, res) => {
  const { userId, eventId } = req.body;

  try {
    await Registration.create({ userId, eventId });
    res.json({ success: true, message: "Event Registered ✅" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Fetch user registrations (for dashboard later)
router.get("/my-registrations/:userId", async (req, res) => {
  const { userId } = req.params;
  const data = await Registration.find({ userId });
  res.json(data);
});

export default router;
