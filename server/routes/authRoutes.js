const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Barcha maydonlarni to‘ldiring" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "Bu email oldin ro‘yxatdan o‘tgan" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "Ro‘yxatdan o‘tish muvaffaqiyatli",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server xatosi" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email va parol kerak" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Email yoki parol noto‘g‘ri" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Email yoki parol noto‘g‘ri" });
    }

    res.json({
      message: "Kirish muvaffaqiyatli",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server xatosi" });
  }
});

router.get("/me", protect, async (req, res) => {
  res.json({
    user: req.user,
  });
});

module.exports = router;