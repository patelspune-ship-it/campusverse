import express from "express";
import { verifyToken } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

// ─── REGISTER PUSH TOKEN ──────────────────────────────────────
// POST /api/user/register-push-token  (any authenticated role)
router.post("/register-push-token", verifyToken, async (req, res) => {
  try {
    const { push_token } = req.body;
    if (!push_token) return res.status(400).json({ message: "push_token is required" });

    await User.findByIdAndUpdate(req.user.id, { push_token });
    res.json({ message: "Push token registered" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
