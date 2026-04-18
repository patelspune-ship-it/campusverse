import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = express.Router();

// Apply verifyToken + role check to every route in this group
router.use(verifyToken, requireRole("faculty"));

// Health check — confirms role gate is working
router.get("/ping", (req, res) => {
  res.json({
    message: "Faculty route accessible",
    user: { id: req.user.id, role: req.user.role },
  });
});

// Future faculty routes go here:
// router.get("/pending-approvals", ...)
// router.patch("/approve-event/:id", ...)
// router.get("/attendance-report/:eventId", ...)

export default router;
