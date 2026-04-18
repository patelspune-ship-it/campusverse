import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// ─── REGISTER (student self-signup only) ─────────────────────
router.post("/register", async (req, res) => {
  const {
    userId, email, mobile, password,
    name, department, year, institute_id,
  } = req.body;

  try {
    if (await User.findOne({ userId })) {
      return res.status(409).json({ message: "This College ID / PRN is already registered" });
    }
    if (email && await User.findOne({ email })) {
      return res.status(409).json({ message: "This email is already registered. Please use a different email." });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user   = await User.create({
      userId,
      email,
      mobile:               mobile || null,
      password:             hashed,
      role:                 "student",
      name:                 name       || null,
      department:           department || null,
      year:                 year       || null,
      institute_id:         institute_id || null,
      profile_completed:    true,
      must_change_password: false,
    });

    // Issue token immediately so the frontend can auto-login
    const token = jwt.sign(
      {
        id:                   user._id,
        role:                 "student",
        institute_id:         user.institute_id || null,
        club_id:              null,
        must_change_password: false,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Registered successfully",
      token,
      user: {
        id:                   user._id,
        userId:               user.userId,
        email:                user.email,
        name:                 user.name,
        mobile:               user.mobile,
        role:                 "student",
        institute_id:         user.institute_id || null,
        club_id:              null,
        must_change_password: false,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      const msg = field === "email"  ? "This email is already registered. Please use a different email."
                : field === "userId" ? "This College ID / PRN is already registered."
                : "A duplicate value was detected. Please check your details.";
      return res.status(409).json({ message: msg });
    }
    console.error("Register error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
});

// ─── LOGIN ───────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { userId, password } = req.body;
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "Account not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign(
      {
        id:                   user._id,
        role:                 user.role || "student",
        institute_id:         user.institute_id || null,
        club_id:              user.club_id || null,
        must_change_password: user.must_change_password || false,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id:                   user._id,
        userId:               user.userId,
        email:                user.email,
        name:                 user.name || null,
        mobile:               user.mobile,
        role:                 user.role || "student",
        institute_id:         user.institute_id || null,
        club_id:              user.club_id || null,
        must_change_password: user.must_change_password || false,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ─── CHANGE PASSWORD (first-login force) ─────────────────────
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
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
