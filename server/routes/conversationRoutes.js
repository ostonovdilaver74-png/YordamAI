const express = require("express");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Barcha chatlarni olish
router.get("/", protect, async (req, res) => {
  const conversations = await Conversation.find({ user: req.user._id })
    .sort({ updatedAt: -1 });

  res.json({ success: true, conversations });
});

// Yangi chat yaratish
router.post("/", protect, async (req, res) => {
  const conversation = await Conversation.create({
    user: req.user._id,
    title: "Yangi chat",
  });

  res.status(201).json({ success: true, conversation });
});

// Bitta chat xabarlarini olish
router.get("/:id/messages", protect, async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!conversation) {
    return res.status(404).json({ message: "Chat topilmadi" });
  }

  const messages = await Message.find({
    conversation: req.params.id,
  }).sort({ createdAt: 1 });

  res.json({ success: true, conversation, messages });
});

// Chatni o‘chirish
router.delete("/:id", protect, async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!conversation) {
    return res.status(404).json({ message: "Chat topilmadi" });
  }

  await Message.deleteMany({ conversation: req.params.id });
  await Conversation.deleteOne({ _id: req.params.id });

  res.json({ success: true, message: "Chat o‘chirildi" });
});

module.exports = router;