const express = require("express");
const mongoose = require("mongoose");

const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");

const {
  protect,
} = require("../middleware/authMiddleware");

const {
  generateAIReply,
  streamAIReply,
} = require("../services/openaiService");

const router = express.Router();

const FREE_DAILY_LIMIT = Number(
  process.env.FREE_DAILY_LIMIT
) || 20;

const MAX_DOCUMENT_LENGTH = Number(
  process.env.MAX_DOCUMENT_LENGTH
) || 30_000;

const ALLOWED_MODEL_KEYS = Object.freeze([
  "GPT",
  "CLAUDE",
  "GEMINI",
  "DEEPSEEK",
]);

/* =========================================================
   YORDAMCHI FUNKSIYALAR
========================================================= */

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function createConversationTitle(message) {
  const cleanMessage = normalizeText(message)
    .replace(/\s+/g, " ");

  if (!cleanMessage) {
    return "Yangi chat";
  }

  if (cleanMessage.length <= 45) {
    return cleanMessage;
  }

  return `${cleanMessage.slice(0, 42)}...`;
}

function normalizeModelKey(modelKey) {
  const normalizedModel = String(
    modelKey || "GEMINI"
  )
    .trim()
    .toUpperCase();

  if (!ALLOWED_MODEL_KEYS.includes(normalizedModel)) {
    return "GEMINI";
  }

  return normalizedModel;
}

function normalizeDocumentContext(
  documentContext
) {
  if (typeof documentContext !== "string") {
    return "";
  }

  return documentContext
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, MAX_DOCUMENT_LENGTH);
}

function getDateKey(date = new Date()) {
  const value = new Date(date);

  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function isDifferentDay(firstDate, secondDate) {
  return (
    getDateKey(firstDate) !==
    getDateKey(secondDate)
  );
}

function getErrorStatus(error) {
  const statusCode = Number(
    error?.statusCode || error?.status
  );

  if (
    Number.isInteger(statusCode) &&
    statusCode >= 400 &&
    statusCode <= 599
  ) {
    return statusCode;
  }

  return 500;
}

function getClientErrorMessage(error) {
  const statusCode = getErrorStatus(error);

  if (
    error?.name === "AbortError" ||
    error?.code === "AI_REQUEST_ABORTED"
  ) {
    return "AI javobini yaratish to‘xtatildi";
  }

  if (
    error?.message?.includes(
      "OPENROUTER_API_KEY"
    )
  ) {
    return error.message;
  }

  if (
    error?.message?.includes("bo‘sh javob")
  ) {
    return "AI modeli bo‘sh javob qaytardi";
  }

  if (statusCode === 400) {
    return "OpenRouter yuborilgan ma’lumotlarni qabul qilmadi";
  }

  if (statusCode === 401) {
    return "OpenRouter API kaliti noto‘g‘ri";
  }

  if (statusCode === 402) {
    return "OpenRouter hisobida yetarli mablag‘ mavjud emas";
  }

  if (statusCode === 403) {
    return "Tanlangan modeldan foydalanishga ruxsat berilmadi";
  }

  if (statusCode === 404) {
    return "Tanlangan AI modeli topilmadi";
  }

  if (
    statusCode === 408 ||
    statusCode === 504
  ) {
    return "AI javobi juda uzoq kutilgani uchun so‘rov to‘xtatildi";
  }

  if (statusCode === 429) {
    return "AI xizmatiga juda ko‘p so‘rov yuborildi. Birozdan keyin qayta urinib ko‘ring.";
  }

  if (
    statusCode === 502 ||
    statusCode === 503
  ) {
    return "Tanlangan AI modeli vaqtincha ishlamayapti";
  }

  return (
    error?.message ||
    "AI javobini olishda server xatosi"
  );
}

function logChatError(error, routeName) {
  console.error(`${routeName} xatosi:`, {
    name: error?.name,
    message: error?.message,
    status:
      error?.statusCode || error?.status,
    code: error?.code,
    requestId:
      error?.request_id ||
      error?.requestId ||
      null,
  });
}

/* =========================================================
   SSE FUNKSIYALARI
========================================================= */

function configureSseResponse(res) {
  res.status(200);

  res.setHeader(
    "Content-Type",
    "text/event-stream; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "no-cache, no-transform"
  );

  res.setHeader(
    "Connection",
    "keep-alive"
  );

  res.setHeader(
    "X-Accel-Buffering",
    "no"
  );

  res.flushHeaders?.();
}

function sendSseEvent(
  res,
  eventName,
  payload
) {
  if (
    res.writableEnded ||
    res.destroyed
  ) {
    return false;
  }

  res.write(`event: ${eventName}\n`);
  res.write(
    `data: ${JSON.stringify(payload)}\n\n`
  );

  return true;
}

function closeSseResponse(res) {
  if (
    !res.writableEnded &&
    !res.destroyed
  ) {
    res.end();
  }
}

/* =========================================================
   USER VA LIMIT
========================================================= */

async function getActiveUser(userId) {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error(
      "Foydalanuvchi topilmadi"
    );

    error.statusCode = 404;
    error.code = "USER_NOT_FOUND";

    throw error;
  }

  if (user.isActive === false) {
    const error = new Error(
      "Foydalanuvchi hisobi bloklangan"
    );

    error.statusCode = 403;
    error.code = "USER_DISABLED";

    throw error;
  }

  return user;
}

async function refreshDailyUsage(user) {
  const today = new Date();

  const lastMessageDate =
    user.dailyMessageDate
      ? new Date(user.dailyMessageDate)
      : today;

  if (
    isDifferentDay(today, lastMessageDate)
  ) {
    user.dailyMessageCount = 0;
    user.dailyMessageDate = today;

    await user.save();
  }

  return user;
}

function getUsageInformation(user) {
  const currentDailyCount = Number(
    user.dailyMessageCount || 0
  );

  const isFree = user.plan === "free";

  return {
    plan: user.plan || "free",

    dailyMessageCount:
      currentDailyCount,

    dailyLimit:
      isFree
        ? FREE_DAILY_LIMIT
        : null,

    remaining:
      isFree
        ? Math.max(
            FREE_DAILY_LIMIT -
              currentDailyCount,
            0
          )
        : null,
  };
}

function assertDailyLimit(user) {
  const currentDailyCount = Number(
    user.dailyMessageCount || 0
  );

  if (
    user.plan === "free" &&
    currentDailyCount >= FREE_DAILY_LIMIT
  ) {
    const error = new Error(
      `🚫 Bugungi bepul ${FREE_DAILY_LIMIT} ta xabar limitingiz tugadi. Ertaga qayta urinib ko‘ring yoki Pro tarifga o‘ting.`
    );

    error.statusCode = 403;
    error.code = "DAILY_LIMIT_REACHED";

    error.usage = {
      plan: user.plan,
      dailyMessageCount:
        currentDailyCount,
      dailyLimit: FREE_DAILY_LIMIT,
      remaining: 0,
    };

    throw error;
  }
}

async function incrementDailyUsage(user) {
  user.dailyMessageCount =
    Number(user.dailyMessageCount || 0) + 1;

  user.dailyMessageDate = new Date();

  await user.save();

  return getUsageInformation(user);
}

/* =========================================================
   CONVERSATION VA MESSAGE
========================================================= */

async function resolveConversation({
  conversationId,
  userId,
  message,
}) {
  if (conversationId) {
    if (
      !mongoose.Types.ObjectId.isValid(
        conversationId
      )
    ) {
      const error = new Error(
        "Chat ID formati noto‘g‘ri"
      );

      error.statusCode = 400;
      error.code =
        "INVALID_CONVERSATION_ID";

      throw error;
    }

    const conversation =
      await Conversation.findOne({
        _id: conversationId,
        user: userId,
      });

    if (!conversation) {
      const error = new Error(
        "Chat topilmadi"
      );

      error.statusCode = 404;
      error.code =
        "CONVERSATION_NOT_FOUND";

      throw error;
    }

    return {
      conversation,
      isNewConversation: false,
    };
  }

  const conversation =
    await Conversation.create({
      user: userId,
      title:
        createConversationTitle(message),
    });

  return {
    conversation,
    isNewConversation: true,
  };
}

async function updateConversationTitleIfNeeded({
  conversation,
  message,
}) {
  const existingMessageCount =
    await Message.countDocuments({
      conversation: conversation._id,
    });

  if (
    existingMessageCount === 0 &&
    (
      !conversation.title ||
      conversation.title === "Yangi chat"
    )
  ) {
    conversation.title =
      createConversationTitle(message);

    await conversation.save();
  }
}

async function getConversationMessages(
  conversationId
) {
  return Message.find({
    conversation: conversationId,
  })
    .sort({
      createdAt: 1,
    })
    .select("role content")
    .lean();
}

async function cleanupFailedRequest({
  userMessageId,
  conversationId,
  isNewConversation,
}) {
  try {
    if (userMessageId) {
      await Message.deleteOne({
        _id: userMessageId,
      });
    }

    if (
      isNewConversation &&
      conversationId
    ) {
      const remainingMessages =
        await Message.countDocuments({
          conversation: conversationId,
        });

      if (remainingMessages === 0) {
        await Conversation.deleteOne({
          _id: conversationId,
        });
      }
    }
  } catch (cleanupError) {
    console.error(
      "Chat cleanup xatosi:",
      cleanupError
    );
  }
}

/* =========================================================
   SO‘ROVNI VALIDATSIYA QILISH
========================================================= */

function normalizeChatRequest(body = {}) {
  const cleanMessage =
    normalizeText(body.message);

  if (!cleanMessage) {
    const error = new Error(
      "Xabar yozilishi kerak"
    );

    error.statusCode = 400;
    error.code = "MESSAGE_REQUIRED";

    throw error;
  }

  return {
    message: cleanMessage,

    conversationId:
      body.conversationId || null,

    modelKey:
      normalizeModelKey(body.modelKey),

    documentContext:
      normalizeDocumentContext(
        body.documentContext
      ),
  };
}

/* =========================================================
   ODDIY JSON CHAT
   POST /api/chat
========================================================= */

router.post(
  "/",
  protect,
  async (req, res) => {
    let conversation = null;
    let userMessage = null;
    let isNewConversation = false;

    try {
      const {
        message,
        conversationId,
        modelKey,
        documentContext,
      } = normalizeChatRequest(req.body);

      const user = await getActiveUser(
        req.user._id
      );

      await refreshDailyUsage(user);
      assertDailyLimit(user);

      const resolved =
        await resolveConversation({
          conversationId,
          userId: user._id,
          message,
        });

      conversation =
        resolved.conversation;

      isNewConversation =
        resolved.isNewConversation;

      await updateConversationTitleIfNeeded({
        conversation,
        message,
      });

      userMessage = await Message.create({
        conversation:
          conversation._id,
        role: "user",
        content: message,
      });

      const previousMessages =
        await getConversationMessages(
          conversation._id
        );

      const aiResult =
        await generateAIReply(
          previousMessages,
          modelKey,
          documentContext
        );

      const assistantMessage =
        await Message.create({
          conversation:
            conversation._id,
          role: "assistant",
          content: aiResult.reply,
        });

      conversation.updatedAt =
        new Date();

      await conversation.save();

      const usage =
        await incrementDailyUsage(user);

      return res.status(200).json({
        success: true,

        conversation,
        userMessage,
        assistantMessage,

        reply: aiResult.reply,

        ai: {
          modelKey:
            aiResult.modelKey ||
            modelKey,

          model:
            aiResult.model,

          finishReason:
            aiResult.finishReason ||
            null,

          usage:
            aiResult.usage || null,

          requestId:
            aiResult.requestId || null,
        },

        document: {
          attached:
            Boolean(documentContext),

          contextLength:
            documentContext.length,
        },

        usage,
      });
    } catch (error) {
      logChatError(
        error,
        "Oddiy chat route"
      );

      if (
        userMessage ||
        isNewConversation
      ) {
        await cleanupFailedRequest({
          userMessageId:
            userMessage?._id || null,

          conversationId:
            conversation?._id || null,

          isNewConversation,
        });
      }

      const statusCode =
        getErrorStatus(error);

      return res
        .status(statusCode)
        .json({
          success: false,

          code:
            error.code ||
            "CHAT_REQUEST_FAILED",

          error:
            getClientErrorMessage(error),

          ...(error.usage
            ? {
                usage: error.usage,
              }
            : {}),
        });
    }
  }
);

/* =========================================================
   STREAMING CHAT
   POST /api/chat/stream
========================================================= */

router.post(
  "/stream",
  protect,
  async (req, res) => {
    let conversation = null;
    let userMessage = null;
    let assistantMessage = null;
    let user = null;

    let isNewConversation = false;
    let streamCompleted = false;
    let clientDisconnected = false;
    let fullReply = "";

    const abortController =
      new AbortController();

    const handleClientClose = () => {
      if (!streamCompleted) {
        clientDisconnected = true;
        abortController.abort();
      }
    };

    req.on("close", handleClientClose);

    try {
      const {
        message,
        conversationId,
        modelKey,
        documentContext,
      } = normalizeChatRequest(req.body);

      user = await getActiveUser(
        req.user._id
      );

      await refreshDailyUsage(user);
      assertDailyLimit(user);

      const resolved =
        await resolveConversation({
          conversationId,
          userId: user._id,
          message,
        });

      conversation =
        resolved.conversation;

      isNewConversation =
        resolved.isNewConversation;

      await updateConversationTitleIfNeeded({
        conversation,
        message,
      });

      userMessage = await Message.create({
        conversation:
          conversation._id,
        role: "user",
        content: message,
      });

      const previousMessages =
        await getConversationMessages(
          conversation._id
        );

      configureSseResponse(res);

      sendSseEvent(
        res,
        "start",
        {
          success: true,

          conversation,

          userMessage,

          ai: {
            modelKey,
          },

          document: {
            attached:
              Boolean(documentContext),

            contextLength:
              documentContext.length,
          },

          usage:
            getUsageInformation(user),
        }
      );

      let finalAiResult = null;

      for await (
        const streamEvent of streamAIReply(
          previousMessages,
          modelKey,
          documentContext,
          {
            signal:
              abortController.signal,
          }
        )
      ) {
        if (
          streamEvent.type === "start"
        ) {
          sendSseEvent(
            res,
            "model",
            {
              model:
                streamEvent.model,

              modelKey:
                streamEvent.modelKey,
            }
          );

          continue;
        }

        if (
          streamEvent.type === "token"
        ) {
          fullReply +=
            streamEvent.token;

          sendSseEvent(
            res,
            "token",
            {
              token:
                streamEvent.token,
            }
          );

          continue;
        }

        if (
          streamEvent.type ===
          "complete"
        ) {
          finalAiResult =
            streamEvent;
        }
      }

      const cleanReply =
        normalizeText(
          finalAiResult?.reply ||
            fullReply
        );

      if (!cleanReply) {
        const error = new Error(
          "AI modeli bo‘sh streaming javob qaytardi"
        );

        error.statusCode = 502;
        error.code = "EMPTY_AI_REPLY";

        throw error;
      }

      assistantMessage =
        await Message.create({
          conversation:
            conversation._id,
          role: "assistant",
          content: cleanReply,
        });

      conversation.updatedAt =
        new Date();

      await conversation.save();

      const usage =
        await incrementDailyUsage(user);

      streamCompleted = true;

      sendSseEvent(
        res,
        "complete",
        {
          success: true,

          conversation,

          userMessage,

          assistantMessage,

          reply: cleanReply,

          ai: {
            modelKey:
              finalAiResult?.modelKey ||
              modelKey,

            model:
              finalAiResult?.model ||
              null,

            finishReason:
              finalAiResult
                ?.finishReason ||
              null,

            usage:
              finalAiResult?.usage ||
              null,

            requestId:
              finalAiResult
                ?.requestId ||
              null,
          },

          document: {
            attached:
              Boolean(documentContext),

            contextLength:
              documentContext.length,
          },

          usage,
        }
      );

      closeSseResponse(res);
    } catch (error) {
      const wasAborted =
        error?.name === "AbortError" ||
        error?.code ===
          "AI_REQUEST_ABORTED" ||
        abortController.signal.aborted;

      if (
        wasAborted &&
        normalizeText(fullReply)
      ) {
        try {
          const partialReply =
            normalizeText(fullReply);

          assistantMessage =
            await Message.create({
              conversation:
                conversation._id,
              role: "assistant",
              content: partialReply,
            });

          conversation.updatedAt =
            new Date();

          await conversation.save();

          if (user) {
            await incrementDailyUsage(
              user
            );
          }
        } catch (savePartialError) {
          console.error(
            "To‘xtatilgan javobni saqlash xatosi:",
            savePartialError
          );
        }
      } else if (
        userMessage ||
        isNewConversation
      ) {
        await cleanupFailedRequest({
          userMessageId:
            userMessage?._id || null,

          conversationId:
            conversation?._id || null,

          isNewConversation,
        });
      }

      if (!clientDisconnected) {
        logChatError(
          error,
          "Streaming chat route"
        );
      }

      if (
        !res.headersSent
      ) {
        const statusCode =
          wasAborted
            ? 499
            : getErrorStatus(error);

        return res
          .status(statusCode)
          .json({
            success: false,

            code:
              wasAborted
                ? "AI_REQUEST_ABORTED"
                : error.code ||
                  "STREAM_REQUEST_FAILED",

            error:
              wasAborted
                ? "AI javobini yaratish to‘xtatildi"
                : getClientErrorMessage(
                    error
                  ),

            ...(error.usage
              ? {
                  usage:
                    error.usage,
                }
              : {}),
          });
      }

      if (!clientDisconnected) {
        sendSseEvent(
          res,
          "error",
          {
            success: false,

            code:
              wasAborted
                ? "AI_REQUEST_ABORTED"
                : error.code ||
                  "STREAM_REQUEST_FAILED",

            error:
              wasAborted
                ? "AI javobini yaratish to‘xtatildi"
                : getClientErrorMessage(
                    error
                  ),

            partialReply:
              normalizeText(
                fullReply
              ),

            ...(error.usage
              ? {
                  usage:
                    error.usage,
                }
              : {}),
          }
        );

        closeSseResponse(res);
      }
    } finally {
      streamCompleted = true;

      req.off(
        "close",
        handleClientClose
      );
    }
  }
);

module.exports = router;