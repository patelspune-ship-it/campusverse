import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = express.Router();

// Apply verifyToken + role check to every route in this group
router.use(verifyToken, requireRole("student"));

// Health check — confirms role gate is working
router.get("/ping", (req, res) => {
  res.json({
    message: "Student route accessible",
    user: { id: req.user.id, role: req.user.role },
  });
});

// Future student routes go here:
// router.get("/my-events", ...)
// router.post("/register-event", ...)
// router.get("/certificates", ...)

export default router;
