import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  const { prn, email, mobile, password } = req.body;

  try {
    const exists = await User.findOne({ prn });
    if (exists) return res.status(409).json({ message: "PRN already registered" });

    const hashed = await bcrypt.hash(password, 10);

    await User.create({ prn, email, mobile, password: hashed });
    return res.json({ message: "Registered successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Server Error" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { prn, password } = req.body;

    // Find user by PRN
    const user = await User.findOne({ prn });
    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Compare hashed passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Create Token
    const token = jwt.sign(
      { id: user._id, role: user.role || "student" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        prn: user.prn,
        email: user.email,
        mobile: user.mobile,
        role: user.role || "student",
      },
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
