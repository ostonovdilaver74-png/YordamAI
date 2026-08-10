const {
  saveMemory,
} = require("./memoryService");

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
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCapturedValue(value) {
  return normalizeText(value)
    .replace(/[.!?;,]+$/g, "")
    .trim()
    .slice(0, 500);
}

/* =========================================================
   SAVOL SO‘ZLARINI TEKSHIRISH
========================================================= */

const QUESTION_VALUES = new Set([
  "nima",
  "kim",
  "qanday",
  "qayerda",
  "qayer",
  "qachon",
  "necha",
  "qancha",
  "qaysi",
  "what",
  "who",
  "where",
  "when",
  "how",
]);

function isQuestionLikeValue(value) {
  const cleanValue = cleanCapturedValue(value)
    .toLowerCase()
    .replace(/\s+/g, " ");

  if (!cleanValue) {
    return true;
  }

  if (QUESTION_VALUES.has(cleanValue)) {
    return true;
  }

  if (cleanValue.endsWith("?")) {
    return true;
  }

  return false;
}

/* =========================================================
   XOTIRA QOIDALARI
========================================================= */

const MEMORY_RULES = [
  {
    category: "identity",
    key: "name",
    importance: 10,

    patterns: [
      /^(?:mening\s+ismim|ismim)\s+(.+)$/i,
      /^meni\s+(.+?)\s+deb\s+chaqir(?:ing|ishingiz mumkin)?$/i,
    ],
  },

  {
    category: "identity",
    key: "location",
    importance: 8,

    patterns: [
      /^men\s+(.+?)danman$/i,
      /^men\s+(.+?)da\s+yashayman$/i,
      /^yashash\s+joyim\s+(.+)$/i,
    ],
  },

  {
    category: "identity",
    key: "occupation",
    importance: 7,

    patterns: [
      /^men\s+(.+?)\s+bo‘lib\s+ishlayman$/i,
      /^men\s+(.+?)\s+bo'lib\s+ishlayman$/i,
      /^kasbim\s+(.+)$/i,
    ],
  },

  {
    category: "preference",
    key: "preferred_language",
    importance: 8,

    patterns: [
      /^men\s+(.+?)\s+tilida\s+javoblarni\s+yoqtiraman$/i,
      /^menga\s+(.+?)\s+tilida\s+javob\s+ber$/i,
      /^doim\s+(.+?)\s+tilida\s+javob\s+ber$/i,
    ],
  },

  {
    category: "preference",
    key: "response_style",
    importance: 7,

    patterns: [
      /^men\s+(.+?)\s+javoblarni\s+yoqtiraman$/i,
      /^menga\s+(.+?)\s+javob\s+ber$/i,
      /^javoblarni\s+(.+?)\s+yoz$/i,
    ],
  },

  {
    category: "project",
    key: "current_project",
    importance: 9,

    patterns: [
      /^men\s+(.+?)\s+loyihasini\s+quryapman$/i,
      /^mening\s+loyiham\s+(.+)$/i,
      /^hozir\s+(.+?)\s+ustida\s+ishlayapman$/i,
    ],
  },

  {
    category: "goal",
    key: "main_goal",
    importance: 8,

    patterns: [
      /^mening\s+maqsadim\s+(.+)$/i,
      /^maqsadim\s+(.+)$/i,
      /^men\s+(.+?)ni\s+xohlayman$/i,
    ],
  },

  {
    category: "personal",
    key: "favorite",
    importance: 6,

    patterns: [
      /^mening\s+sevimli\s+(.+?)im\s+(.+)$/i,
      /^men\s+(.+?)ni\s+juda\s+yoqtiraman$/i,
    ],
  },
];

/* =========================================================
   XOTIRANI ANIQLASH
========================================================= */

function extractMemoryCandidates(message) {
  const cleanMessage =
    normalizeText(message);

  if (!cleanMessage) {
    return [];
  }

  if (cleanMessage.endsWith("?")) {
    return [];
  }

  const candidates = [];

  for (const rule of MEMORY_RULES) {
    for (const pattern of rule.patterns) {
      const match =
        cleanMessage.match(pattern);

      if (!match) {
        continue;
      }

      let value = "";

      if (
        rule.key === "favorite" &&
        match[1] &&
        match[2]
      ) {
        value =
          `${match[1]}: ${match[2]}`;
      } else {
        value =
          match[1] || "";
      }

      const cleanValue =
        cleanCapturedValue(value);

      if (!cleanValue) {
        continue;
      }

      if (
        rule.key === "name" &&
        isQuestionLikeValue(cleanValue)
      ) {
        continue;
      }

      candidates.push({
        category:
          rule.category,

        key:
          rule.key,

        value:
          cleanValue,

        importance:
          rule.importance,

        confidence:
          0.95,
      });

      break;
    }
  }

  return candidates;
}

/* =========================================================
   XOTIRALARNI SAQLASH
========================================================= */

async function extractAndSaveMemories({
  userId,
  message,
  conversationId = null,
  messageId = null,
}) {
  if (!userId || !message) {
    return [];
  }

  const candidates =
    extractMemoryCandidates(message);

  if (candidates.length === 0) {
    return [];
  }

  const savedMemories = [];

  for (const candidate of candidates) {
    try {
      const memory =
        await saveMemory({
          userId,

          category:
            candidate.category,

          key:
            candidate.key,

          value:
            candidate.value,

          sourceConversation:
            conversationId,

          sourceMessage:
            messageId,

          importance:
            candidate.importance,

          confidence:
            candidate.confidence,
        });

      savedMemories.push(memory);
    } catch (error) {
      console.error(
        "AUTO MEMORY SAQLASH XATOSI:",
        {
          key:
            candidate.key,

          message:
            error?.message,
        }
      );
    }
  }

  return savedMemories;
}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  extractMemoryCandidates,
  extractAndSaveMemories,
};