const Memory = require("../models/Memory");

const MAX_MEMORIES_FOR_PROMPT =
  Number(process.env.MAX_MEMORIES_FOR_PROMPT) || 20;

const MAX_MEMORY_VALUE_LENGTH =
  Number(process.env.MAX_MEMORY_VALUE_LENGTH) || 1000;

/* =========================================================
   MATNNI TOZALASH
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

function normalizeKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\-\s]/gu, "")
    .replace(/\s+/g, "_")
    .slice(0, 120);
}

/* =========================================================
   XOTIRA SAQLASH
========================================================= */

async function saveMemory({
  userId,
  category = "other",
  key,
  value,
  sourceConversation = null,
  sourceMessage = null,
  importance = 5,
  confidence = 1,
}) {
  const cleanKey = normalizeKey(key);

  const cleanValue = normalizeText(value).slice(
    0,
    MAX_MEMORY_VALUE_LENGTH
  );

  if (!userId) {
    throw new Error("Memory uchun userId kerak");
  }

  if (!cleanKey || !cleanValue) {
    throw new Error(
      "Memory key va value bo‘sh bo‘lishi mumkin emas"
    );
  }

  const safeImportance = Math.min(
    Math.max(Number(importance) || 5, 1),
    10
  );

  const safeConfidence = Math.min(
    Math.max(Number(confidence) || 1, 0),
    1
  );

  const memory = await Memory.findOneAndUpdate(
    {
      user: userId,
      key: cleanKey,
    },
    {
      $set: {
        category,
        value: cleanValue,
        sourceConversation,
        sourceMessage,
        importance: safeImportance,
        confidence: safeConfidence,
        isActive: true,
      },
      $setOnInsert: {
        user: userId,
        key: cleanKey,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  return memory;
}

/* =========================================================
   FOYDALANUVCHI XOTIRALARINI OLISH
========================================================= */

async function getUserMemories(
  userId,
  limit = MAX_MEMORIES_FOR_PROMPT
) {
  if (!userId) {
    return [];
  }

  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  return Memory.find({
    user: userId,
    isActive: true,
  })
    .sort({
      importance: -1,
      updatedAt: -1,
    })
    .limit(safeLimit)
    .lean();
}

/* =========================================================
   AI PROMPT UCHUN XOTIRANI TAYYORLASH
========================================================= */

function formatMemoriesForPrompt(memories = []) {
  if (!Array.isArray(memories) || memories.length === 0) {
    return "";
  }

  const lines = memories
    .filter((memory) => memory?.value)
    .map((memory, index) => {
      const category =
        normalizeText(memory.category) || "other";

      const key =
        normalizeText(memory.key) || `memory_${index + 1}`;

      const value =
        normalizeText(memory.value).slice(
          0,
          MAX_MEMORY_VALUE_LENGTH
        );

      return `- [${category}] ${key}: ${value}`;
    });

  if (lines.length === 0) {
    return "";
  }

  return [
    "Foydalanuvchi haqida saqlangan xotiralar:",
    ...lines,
    "",
    "Ushbu xotiralardan faqat foydalanuvchiga foydali bo‘lsa foydalan.",
    "Xotirani mutlaq haqiqat deb qabul qilma.",
    "Joriy suhbat xotiraga zid bo‘lsa, joriy suhbatni ustun qo‘y.",
  ].join("\n");
}

/* =========================================================
   XOTIRANI ISHLATILGAN DEB BELGILASH
========================================================= */

async function markMemoriesAsUsed(memoryIds = []) {
  const validIds = Array.isArray(memoryIds)
    ? memoryIds.filter(Boolean)
    : [];

  if (validIds.length === 0) {
    return;
  }

  await Memory.updateMany(
    {
      _id: {
        $in: validIds,
      },
    },
    {
      $set: {
        lastUsedAt: new Date(),
      },
      $inc: {
        usageCount: 1,
      },
    }
  );
}

/* =========================================================
   XOTIRANI O‘CHIRISH
========================================================= */

async function deleteMemory({
  userId,
  memoryId,
}) {
  if (!userId || !memoryId) {
    return null;
  }

  return Memory.findOneAndDelete({
    _id: memoryId,
    user: userId,
  });
}

/* =========================================================
   BARCHA XOTIRALARNI TOZALASH
========================================================= */

async function clearUserMemories(userId) {
  if (!userId) {
    return {
      deletedCount: 0,
    };
  }

  return Memory.deleteMany({
    user: userId,
  });
}

module.exports = {
  saveMemory,
  getUserMemories,
  formatMemoriesForPrompt,
  markMemoriesAsUsed,
  deleteMemory,
  clearUserMemories,
};