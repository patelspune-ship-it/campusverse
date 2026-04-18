import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = express.Router();

// Apply verifyToken + role check to every route in this group
// requireRole() with no extra args — only super_admin passes (it always bypasses)
router.use(verifyToken, requireRole("super_admin"));

// Health check — confirms role gate is working
router.get("/ping", (req, res) => {
  res.json({
    message: "Super admin route accessible",
    user: { id: req.user.id, role: req.user.role },
  });
});

// Future super_admin routes go here:
// router.get("/all-users", ...)
// router.patch("/set-role/:userId", ...)
// router.get("/all-clubs", ...)
// router.delete("/remove-event/:id", ...)

export default router;
