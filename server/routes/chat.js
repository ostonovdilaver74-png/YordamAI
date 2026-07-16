const express = require("express");

const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");

const { protect } = require("../middleware/authMiddleware");
const { generateAIReply } = require("../services/openaiService");

const router = express.Router();

const FREE_DAILY_LIMIT = 20;
const ALLOWED_MODEL_KEYS = [
  "GPT",
  "CLAUDE",
  "GEMINI",
  "DEEPSEEK",
];

function createConversationTitle(message) {
  const cleanMessage = message.trim().replace(/\s+/g, " ");

  if (cleanMessage.length <= 45) {
    return cleanMessage;
  }

  return `${cleanMessage.slice(0, 42)}...`;
}

function isDifferentDay(firstDate, secondDate) {
  return (
    firstDate.getFullYear() !== secondDate.getFullYear() ||
    firstDate.getMonth() !== secondDate.getMonth() ||
    firstDate.getDate() !== secondDate.getDate()
  );
}

function normalizeModelKey(modelKey) {
  const normalizedModel = String(
    modelKey || "GEMINI"
  ).toUpperCase();

  if (!ALLOWED_MODEL_KEYS.includes(normalizedModel)) {
    return "GEMINI";
  }

  return normalizedModel;
}

router.post("/", protect, async (req, res) => {
  try {
    const {
      message,
      conversationId,
      modelKey,
    } = req.body;

    const cleanMessage = message?.trim();
    const selectedModelKey =
      normalizeModelKey(modelKey);

    if (!cleanMessage) {
      return res.status(400).json({
        success: false,
        error: "Xabar yozilishi kerak",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Foydalanuvchi topilmadi",
      });
    }

    const today = new Date();

    const lastMessageDate = user.dailyMessageDate
      ? new Date(user.dailyMessageDate)
      : today;

    if (isDifferentDay(today, lastMessageDate)) {
      user.dailyMessageCount = 0;
      user.dailyMessageDate = today;

      await user.save();
    }

    if (
      user.plan === "free" &&
      Number(user.dailyMessageCount || 0) >=
        FREE_DAILY_LIMIT
    ) {
      return res.status(403).json({
        success: false,
        code: "DAILY_LIMIT_REACHED",
        error:
          "🚫 Bugungi bepul 20 ta xabar limitingiz tugadi. Ertaga qayta urinib ko‘ring yoki Pro tarifga o‘ting.",
        limit: FREE_DAILY_LIMIT,
        used: Number(user.dailyMessageCount || 0),
        remaining: 0,
      });
    }

    let conversation;

    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        user: user._id,
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: "Chat topilmadi",
        });
      }
    } else {
      conversation = await Conversation.create({
        user: user._id,
        title: createConversationTitle(cleanMessage),
      });
    }

    const existingMessageCount =
      await Message.countDocuments({
        conversation: conversation._id,
      });

    if (
      existingMessageCount === 0 &&
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

    const aiResult = await generateAIReply(
      previousMessages,
      selectedModelKey
    );

    const reply = aiResult.reply;
    const usedModel = aiResult.model;

    const assistantMessage = await Message.create({
      conversation: conversation._id,
      role: "assistant",
      content: reply,
    });

    conversation.updatedAt = new Date();
    await conversation.save();

    user.dailyMessageCount =
      Number(user.dailyMessageCount || 0) + 1;

    user.dailyMessageDate = today;

    await user.save();

    const remaining =
      user.plan === "free"
        ? Math.max(
            FREE_DAILY_LIMIT -
              user.dailyMessageCount,
            0
          )
        : null;

    return res.json({
      success: true,
      conversation,
      userMessage,
      assistantMessage,
      reply,

      ai: {
        modelKey: selectedModelKey,
        model: usedModel,
      },

      usage: {
        plan: user.plan,
        dailyMessageCount:
          user.dailyMessageCount,
        dailyLimit:
          user.plan === "free"
            ? FREE_DAILY_LIMIT
            : null,
        remaining,
      },
    });
  } catch (error) {
    console.error("Chat route xatosi:", {
      message: error.message,
      status: error.status,
      code: error.code,
      requestId: error.request_id,
    });

    let statusCode = error.status || 500;
    let errorMessage =
      "AI javobini olishda server xatosi";

    if (error.status === 400) {
      errorMessage =
        "OpenRouter so‘rov ma’lumotlarini qabul qilmadi";
    } else if (error.status === 401) {
      errorMessage =
        "OpenRouter API kaliti noto‘g‘ri";
    } else if (error.status === 402) {
      errorMessage =
        "OpenRouter hisobida yetarli mablag‘ mavjud emas";
    } else if (error.status === 403) {
      errorMessage =
        "Tanlangan modeldan foydalanishga ruxsat berilmadi";
    } else if (error.status === 404) {
      errorMessage =
        "Tanlangan AI modeli topilmadi";
    } else if (error.status === 408) {
      errorMessage =
        "AI javobi juda uzoq kutilgani uchun so‘rov to‘xtatildi";
    } else if (error.status === 429) {
      errorMessage =
        "OpenRouter so‘rov limiti tugadi. Birozdan keyin qayta urinib ko‘ring.";
    } else if (
      error.status === 502 ||
      error.status === 503
    ) {
      errorMessage =
        "Tanlangan AI modeli vaqtincha ishlamayapti";
    } else if (
      error.message?.includes(
        "OPENROUTER_API_KEY"
      )
    ) {
      statusCode = 500;
      errorMessage = error.message;
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  }
});

module.exports = router;