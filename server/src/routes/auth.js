import { Router } from "express";
import bcrypt from "bcryptjs";

import { User } from "../models/User.js";
import { createToken, requireAuth } from "../middleware/auth.js";

const router = Router();

function toUserResponse(user) {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  };
}

router.post("/signup", async (req, res) => {
  const { fullName, role, email, password } = req.body ?? {};

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ message: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(String(password), 12);
  const user = await User.create({
    fullName: String(fullName).trim(),
    role: role === "admin" ? "admin" : "sst",
    email: normalizedEmail,
    passwordHash,
  });

  const token = createToken(user);
  return res.status(201).json({ token, user: toUserResponse(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const isValid = await bcrypt.compare(String(password), user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = createToken(user);
  return res.json({ token, user: toUserResponse(user) });
});

router.get("/me", requireAuth, async (req, res) => {
  return res.json({ user: toUserResponse(req.user) });
});

export default router;
