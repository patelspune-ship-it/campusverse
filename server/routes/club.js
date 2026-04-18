import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = express.Router();

// Apply verifyToken + role check to every route in this group
router.use(verifyToken, requireRole("club_admin"));

// Health check — confirms role gate is working
router.get("/ping", (req, res) => {
  res.json({
    message: "Club admin route accessible",
    user: { id: req.user.id, role: req.user.role },
  });
});

// Future club_admin routes go here:
// router.post("/create-event", ...)
// router.get("/my-club/events", ...)
// router.post("/scan-qr", ...)

export default router;
