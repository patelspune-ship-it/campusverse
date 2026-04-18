import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  const { userId, email, mobile, password, role, institute_id } = req.body;

  // Only allow valid roles from the client; default to student
  const allowedRoles = ["student", "club_admin", "faculty", "super_admin"];
  const assignedRole = allowedRoles.includes(role) ? role : "student";

  try {
    const exists = await User.findOne({ userId });
    if (exists) return res.status(409).json({ message: "User ID already registered" });

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      userId,
      email,
      mobile,
      password: hashed,
      role: assignedRole,
      institute_id: institute_id || null,
    });
    return res.json({ message: "Registered successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Server Error" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { userId, password } = req.body;

    // Find user by userId
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Compare hashed passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Create Token — embed all fields needed by middleware and frontend
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role || "student",
        institute_id: user.institute_id || null,
        club_id: user.club_id || null,
        must_change_password: user.must_change_password || false,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        userId: user.userId,
        email: user.email,
        mobile: user.mobile,
        role: user.role || "student",
        institute_id: user.institute_id || null,
        club_id: user.club_id || null,
        must_change_password: user.must_change_password || false,
      },
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// CHANGE PASSWORD — used for forced first-login password change
router.post("/change-password", verifyToken, async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.user.id, {
      password: hashed,
      must_change_password: false,
    });
    return res.json({ message: "Password changed successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
