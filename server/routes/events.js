import express from "express";
import Registration from "../models/Registration.js";
import Event from "../models/Event.js";

const router = express.Router();

// Register for event
router.post("/register", async (req, res) => {
  const { userPrn, eventId } = req.body;

  try {
    await Registration.create({ userPrn, eventId });
    res.json({ success: true, message: "Event Registered ✅" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Fetch user registrations (for dashboard later)
router.get("/my-registrations/:prn", async (req, res) => {
  const { prn } = req.params;
  const data = await Registration.find({ userPrn: prn });
  res.json(data);
});

export default router;
