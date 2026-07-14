const express = require("express");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { protect } = require("../middleware/authMiddleware");
const { generateAIReply } = require("../services/openaiService");

const router = express.Router();

function createConversationTitle(message) {
  const cleanMessage = message
    .trim()
    .replace(/\s+/g, " ");

  if (cleanMessage.length <= 45) {
    return cleanMessage;
  }

  return `${cleanMessage.slice(0, 42)}...`;
}

router.post("/", protect, async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const cleanMessage = message?.trim();

    if (!cleanMessage) {
      return res.status(400).json({
        success: false,
        error: "Xabar yozilishi kerak",
      });
    }

    let conversation;

    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        user: req.user._id,
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: "Chat topilmadi",
        });
      }
    } else {
      conversation = await Conversation.create({
        user: req.user._id,
        title: createConversationTitle(cleanMessage),
      });
    }

    const messageCount = await Message.countDocuments({
      conversation: conversation._id,
    });

    if (
      messageCount === 0 &&
      (!conversation.title ||
        conversation.title === "Yangi chat")
    ) {
      conversation.title =
        createConversationTitle(cleanMessage);
    }

    const userMessage = await Message.create({
      conversation: conversation._id,
      role: "user",
      content: cleanMessage,
    });

    const previousMessages = await Message.find({
      conversation: conversation._id,
    })
      .sort({ createdAt: 1 })
      .select("role content")
      .lean();

    const reply = await generateAIReply(previousMessages);

    const assistantMessage = await Message.create({
      conversation: conversation._id,
      role: "assistant",
      content: reply,
    });

    conversation.updatedAt = new Date();
    await conversation.save();

    return res.json({
      success: true,
      conversation,
      userMessage,
      assistantMessage,
      reply,
    });
  } catch (error) {
    console.error("Chat route xatosi:", {
      message: error.message,
      status: error.status,
      requestId: error.request_id,
    });

    let errorMessage =
      "AI javobini olishda server xatosi";

    if (error.status === 401) {
      errorMessage = "OpenAI API kaliti noto‘g‘ri";
    } else if (error.status === 429) {
      errorMessage =
        "AI limiti tugagan yoki hisobda mablag‘ yetarli emas";
    } else if (
      error.message?.includes("OPENAI_API_KEY")
    ) {
      errorMessage = error.message;
    }

    return res.status(error.status || 500).json({
      success: false,
      error: errorMessage,
    });
  }
});

module.exports = router;