const Memory = require("../models/Memory");

const MAX_MEMORIES_FOR_PROMPT =
  Number(process.env.MAX_MEMORIES_FOR_PROMPT) || 20;

const MAX_RELEVANT_MEMORIES =
  Number(process.env.MAX_RELEVANT_MEMORIES) || 8;

const MAX_MEMORY_VALUE_LENGTH =
  Number(process.env.MAX_MEMORY_VALUE_LENGTH) || 1000;

const ALLOWED_CATEGORIES = new Set([
  "identity",
  "preference",
  "project",
  "goal",
  "personal",
  "instruction",
  "other",
]);

/* =========================================================
   NORMALIZATION
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

function normalizeCategory(value) {
  const category =
    normalizeText(value).toLowerCase();

  return ALLOWED_CATEGORIES.has(category)
    ? category
    : "other";
}

function normalizeImportance(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 5;
  }

  return Math.min(
    Math.max(
      Math.round(numericValue),
      1
    ),
    10
  );
}

function normalizeConfidence(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 1;
  }

  return Math.min(
    Math.max(
      numericValue,
      0
    ),
    1
  );
}

/* =========================================================
   XOTIRA SAQLASH / YANGILASH
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
  if (!userId) {
    throw new Error(
      "Memory uchun userId kerak"
    );
  }

  const cleanKey =
    normalizeKey(key);

  const cleanValue =
    normalizeText(value).slice(
      0,
      MAX_MEMORY_VALUE_LENGTH
    );

  if (!cleanKey || !cleanValue) {
    throw new Error(
      "Memory key va value bo‘sh bo‘lishi mumkin emas"
    );
  }

  const safeCategory =
    normalizeCategory(category);

  const safeImportance =
    normalizeImportance(
      importance
    );

  const safeConfidence =
    normalizeConfidence(
      confidence
    );

  return Memory.findOneAndUpdate(
    {
      user: userId,
      key: cleanKey,
    },
    {
      $set: {
        category:
          safeCategory,

        value:
          cleanValue,

        sourceConversation:
          sourceConversation || null,

        sourceMessage:
          sourceMessage || null,

        importance:
          safeImportance,

        confidence:
          safeConfidence,

        isActive:
          true,
      },

      $setOnInsert: {
        user:
          userId,

        key:
          cleanKey,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );
}

/* =========================================================
   KEY BO‘YICHA MEMORY OLISH
========================================================= */

async function getMemoryByKey({
  userId,
  key,
  includeInactive = false,
}) {
  if (!userId) {
    return null;
  }

  const cleanKey =
    normalizeKey(key);

  if (!cleanKey) {
    return null;
  }

  const query = {
    user:
      userId,

    key:
      cleanKey,
  };

  if (!includeInactive) {
    query.isActive = true;
  }

  return Memory.findOne(
    query
  );
}

/* =========================================================
   FOYDALANUVCHI XOTIRALARI
========================================================= */

async function getUserMemories(
  userId,
  limit = MAX_MEMORIES_FOR_PROMPT
) {
  if (!userId) {
    return [];
  }

  const numericLimit =
    Number(limit);

  const safeLimit =
    Number.isFinite(numericLimit)
      ? Math.min(
          Math.max(
            Math.trunc(
              numericLimit
            ),
            1
          ),
          100
        )
      : MAX_MEMORIES_FOR_PROMPT;

  return Memory.find({
    user:
      userId,

    isActive:
      true,
  })
    .sort({
      importance: -1,
      updatedAt: -1,
    })
    .limit(
      safeLimit
    )
    .lean();
}

/* =========================================================
   RELEVANCE KEYWORDS
========================================================= */

const RELEVANCE_RULES = {
  name: [
    "ism",
    "ismim",
    "name",
    "meni nima deb",
    "meni kim deb",
  ],

  location: [
    "qayer",
    "qayerda",
    "yashayman",
    "shahar",
    "joylashuv",
    "location",
    "city",
    "where",
  ],

  occupation: [
    "kasb",
    "ishlayman",
    "ishim",
    "kasbim",
    "profession",
    "occupation",
    "job",
    "work",
  ],

  software_tools: [
    "dastur",
    "dasturlar",
    "program",
    "software",
    "tool",
    "vosita",
    "autocad",
    "kompas",
    "solidworks",
    "sheetcam",
  ],

  current_project: [
    "loyiha",
    "loyiham",
    "project",
    "ustida ishlayapman",
    "quryapman",
  ],

  main_goal: [
    "maqsad",
    "maqsadim",
    "goal",
    "objective",
    "xohlayman",
  ],

  preferred_language: [
    "til",
    "qaysi tilda",
    "language",
    "o‘zbek",
    "uzbek",
    "rus",
    "russian",
    "english",
    "ingliz",
  ],

  response_style: [
    "javob",
    "uslub",
    "qisqa",
    "batafsil",
    "aniq",
    "tushunarli",
    "response style",
    "answer style",
  ],

  favorite: [
    "sevimli",
    "yoqtiraman",
    "favorite",
    "like",
  ],
};

/* =========================================================
   RELEVANCE SCORE
========================================================= */

function getMemoryRelevanceScore(
  memory,
  query
) {
  if (!memory) {
    return 0;
  }

  const cleanQuery =
    normalizeText(query)
      .toLowerCase();

  if (!cleanQuery) {
    return 0;
  }

  const key =
    normalizeKey(
      memory.key
    );

  const value =
    normalizeText(
      memory.value
    ).toLowerCase();

  const category =
    normalizeCategory(
      memory.category
    );

  let score = 0;

  /*
    Muhimlik — asosiy bazaviy score.
  */

  score +=
    normalizeImportance(
      memory.importance
    ) * 0.5;

  /*
    Confidence ham ozgina ta’sir qiladi.
  */

  score +=
    normalizeConfidence(
      memory.confidence
    ) * 2;

  /*
    Key query ichida bevosita uchrasa.
  */

  if (
    key &&
    cleanQuery.includes(
      key.replace(/_/g, " ")
    )
  ) {
    score += 8;
  }

  /*
    Value ichidagi so‘z query bilan mos kelsa.
  */

  const valueWords =
    value
      .split(/\s+/)
      .filter(
        (word) =>
          word.length >= 3
      );

  for (
    const word of
      valueWords
  ) {
    if (
      cleanQuery.includes(
        word
      )
    ) {
      score += 1.5;
    }
  }

  /*
    Canonical key bo‘yicha keyword matching.
  */

  const keywords =
    RELEVANCE_RULES[
      key
    ] || [];

  for (
    const keyword of
      keywords
  ) {
    if (
      cleanQuery.includes(
        keyword.toLowerCase()
      )
    ) {
      score += 5;
    }
  }

  /*
    Preference/instruction xotiralari
    ko‘pincha barcha javoblarga foydali.
  */

  if (
    category === "preference" ||
    category === "instruction"
  ) {
    score += 2.5;
  }

  return score;
}

/* =========================================================
   RELEVANT MEMORY TANLASH
========================================================= */

function selectRelevantMemories(
  memories = [],
  query = "",
  limit = MAX_RELEVANT_MEMORIES
) {
  if (
    !Array.isArray(memories) ||
    memories.length === 0
  ) {
    return [];
  }

  const safeLimit =
    Math.min(
      Math.max(
        Number(limit) || MAX_RELEVANT_MEMORIES,
        1
      ),
      20
    );

  const scored =
    memories
      .filter(
        (memory) =>
          memory &&
          memory.isActive !== false &&
          normalizeText(
            memory.value
          )
      )
      .map(
        (memory) => ({
          memory,

          score:
            getMemoryRelevanceScore(
              memory,
              query
            ),
        })
      );

  const relevant =
    scored
      .filter(
        (item) =>
          item.score >= 3
      )
      .sort(
        (a, b) => {
          if (
            b.score !==
            a.score
          ) {
            return (
              b.score -
              a.score
            );
          }

          const bImportance =
            normalizeImportance(
              b.memory.importance
            );

          const aImportance =
            normalizeImportance(
              a.memory.importance
            );

          if (
            bImportance !==
            aImportance
          ) {
            return (
              bImportance -
              aImportance
            );
          }

          return (
            new Date(
              b.memory.updatedAt || 0
            ).getTime() -
            new Date(
              a.memory.updatedAt || 0
            ).getTime()
          );
        }
      )
      .slice(
        0,
        safeLimit
      )
      .map(
        (item) =>
          item.memory
      );

  /*
    Preference va instruction xotiralari
    agar topilgan bo‘lsa doimiy ravishda
    promptga kirishi foydali.
  */

  const globalPreferences =
    memories.filter(
      (memory) =>
        memory &&
        memory.isActive !== false &&
        (
          memory.category ===
            "preference" ||
          memory.category ===
            "instruction"
        )
    );

  const merged =
    new Map();

  for (
    const memory of [
      ...globalPreferences,
      ...relevant,
    ]
  ) {
    if (!memory?._id) {
      continue;
    }

    merged.set(
      String(
        memory._id
      ),
      memory
    );
  }

  return [
    ...merged.values(),
  ]
    .sort(
      (a, b) =>
        normalizeImportance(
          b.importance
        ) -
        normalizeImportance(
          a.importance
        )
    )
    .slice(
      0,
      safeLimit
    );
}

/* =========================================================
   RELEVANT MEMORY DB ORQALI OLISH
========================================================= */

async function getRelevantMemories({
  userId,
  query = "",
  limit = MAX_RELEVANT_MEMORIES,
}) {
  if (!userId) {
    return [];
  }

  /*
    Avval kengroq pool olamiz,
    keyin serverda relevance score qilamiz.
  */

  const memories =
    await getUserMemories(
      userId,
      Math.max(
        MAX_MEMORIES_FOR_PROMPT,
        50
      )
    );

  return selectRelevantMemories(
    memories,
    query,
    limit
  );
}

/* =========================================================
   MEMORY PROMPT
========================================================= */

function formatMemoriesForPrompt(
  memories = []
) {
  if (
    !Array.isArray(memories) ||
    memories.length === 0
  ) {
    return "";
  }

  const lines =
    memories
      .filter(
        (memory) =>
          memory &&
          memory.isActive !== false &&
          normalizeText(
            memory.value
          )
      )
      .map(
        (
          memory,
          index
        ) => {
          const category =
            normalizeCategory(
              memory.category
            );

          const key =
            normalizeKey(
              memory.key
            ) ||
            `memory_${index + 1}`;

          const value =
            normalizeText(
              memory.value
            ).slice(
              0,
              MAX_MEMORY_VALUE_LENGTH
            );

          return (
            `- [${category}] ` +
            `${key}: ${value}`
          );
        }
      );

  if (
    lines.length === 0
  ) {
    return "";
  }

  return [
    "Foydalanuvchi haqida joriy savol uchun tegishli xotiralar:",
    ...lines,
    "",
    "Xotira qoidalari:",
    "- Faqat joriy savolga foydali bo‘lsa foydalan.",
    "- Joriy suhbat eski xotiraga zid bo‘lsa, joriy suhbatni ustun qo‘y.",
    "- Eng yangi ma’lumotni ustun qo‘y.",
    "- Xotirada yo‘q ma’lumotni o‘ylab topma.",
    "- Xotirani foydalanuvchi o‘zi aytgan ma’lumot sifatida talqin qil.",
  ].join("\n");
}

/* =========================================================
   MEMORY ISHLATILGAN
========================================================= */

async function markMemoriesAsUsed(
  memoryIds = []
) {
  const validIds =
    Array.isArray(memoryIds)
      ? memoryIds.filter(Boolean)
      : [];

  if (
    validIds.length === 0
  ) {
    return {
      modifiedCount: 0,
    };
  }

  return Memory.updateMany(
    {
      _id: {
        $in:
          validIds,
      },
    },
    {
      $set: {
        lastUsedAt:
          new Date(),
      },

      $inc: {
        usageCount:
          1,
      },
    }
  );
}

/* =========================================================
   MEMORY SOFT DELETE
========================================================= */

async function deactivateMemoryByKey({
  userId,
  key,
}) {
  if (!userId || !key) {
    return null;
  }

  return Memory.findOneAndUpdate(
    {
      user:
        userId,

      key:
        normalizeKey(key),

      isActive:
        true,
    },
    {
      $set: {
        isActive:
          false,
      },
    },
    {
      new:
        true,
    }
  );
}

/* =========================================================
   BITTA MEMORY HARD DELETE
========================================================= */

async function deleteMemory({
  userId,
  memoryId,
}) {
  if (
    !userId ||
    !memoryId
  ) {
    return null;
  }

  return Memory.findOneAndDelete({
    _id:
      memoryId,

    user:
      userId,
  });
}

/* =========================================================
   BARCHA MEMORYLARNI TOZALASH
========================================================= */

async function clearUserMemories(
  userId
) {
  if (!userId) {
    return {
      acknowledged:
        true,

      deletedCount:
        0,
    };
  }

  return Memory.deleteMany({
    user:
      userId,
  });
}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  saveMemory,

  getMemoryByKey,

  getUserMemories,

  getRelevantMemories,

  selectRelevantMemories,

  getMemoryRelevanceScore,

  formatMemoriesForPrompt,

  markMemoriesAsUsed,

  deactivateMemoryByKey,

  deleteMemory,

  clearUserMemories,

  normalizeKey,

  normalizeCategory,
};