const {
  saveMemory,
  getMemoryByKey,
  getUserMemories,
  deactivateMemoryByKey,
  normalizeKey,
  normalizeCategory,
} = require("./memoryService");

const {
  getOpenRouterClient,
  resolveModel,
} = require("./openaiService");

/* =========================================================
   SOZLAMALAR
========================================================= */

const MEMORY_EXTRACTOR_MODEL_KEY =
  process.env.MEMORY_EXTRACTOR_MODEL_KEY ||
  "GEMINI";

const MAX_MEMORY_CANDIDATES =
  Math.min(
    Math.max(
      Number(
        process.env.MAX_MEMORY_CANDIDATES
      ) || 5,
      1
    ),
    10
  );

const MEMORY_MIN_CONFIDENCE =
  Math.min(
    Math.max(
      Number(
        process.env.MEMORY_MIN_CONFIDENCE
      ) || 0.75,
      0
    ),
    1
  );

const MAX_INPUT_LENGTH =
  Number(
    process.env.MEMORY_MAX_INPUT_LENGTH
  ) || 5000;

const MAX_MEMORY_VALUE_LENGTH =
  Number(
    process.env.MAX_MEMORY_VALUE_LENGTH
  ) || 1000;

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

function cleanValue(value) {
  return normalizeText(value)
    .replace(/[.!?;,]+$/g, "")
    .trim()
    .slice(
      0,
      MAX_MEMORY_VALUE_LENGTH
    );
}

/* =========================================================
   QUESTION CHECK
========================================================= */

const QUESTION_WORDS =
  new Set([
    "nima",
    "kim",
    "qanday",
    "qayer",
    "qayerda",
    "qachon",
    "necha",
    "qancha",
    "qaysi",
    "nega",
    "what",
    "who",
    "where",
    "when",
    "how",
    "why",
  ]);

function isQuestionLike(
  value
) {
  const clean =
    normalizeText(value)
      .toLowerCase();

  if (!clean) {
    return true;
  }

  if (
    clean.endsWith("?")
  ) {
    return true;
  }

  const firstWord =
    clean
      .split(/\s+/)[0];

  return QUESTION_WORDS.has(
    firstWord
  );
}

/* =========================================================
   MAXFIY MA’LUMOT FILTRI
========================================================= */

const SENSITIVE_PATTERNS = [
  /\bpassword\b/i,
  /\bparol\b/i,
  /\bpasswd\b/i,

  /\bapi[\s_-]?key\b/i,
  /\bsecret[\s_-]?key\b/i,
  /\baccess[\s_-]?token\b/i,
  /\brefresh[\s_-]?token\b/i,
  /\bbearer\s+[a-z0-9._-]+/i,

  /\bjwt\b/i,

  /\bprivate[\s_-]?key\b/i,

  /\bpin[\s_-]?(?:code|kod)?\b/i,
  /\bcvv\b/i,
  /\bcvc\b/i,

  /\b(?:\d[ -]*?){13,19}\b/,

  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,

  /\bsk-[a-z0-9_-]{12,}\b/i,
];

function containsSensitiveData(
  value
) {
  const clean =
    normalizeText(value);

  if (!clean) {
    return false;
  }

  return SENSITIVE_PATTERNS.some(
    (pattern) =>
      pattern.test(clean)
  );
}

/* =========================================================
   VAQTINCHALIK MA’LUMOT FILTRI
========================================================= */

const TEMPORARY_PATTERNS = [
  /\bbugun\b/i,
  /\bhozir\b/i,
  /\bhozircha\b/i,
  /\bayni paytda\b/i,
  /\bshu daqiqada\b/i,
  /\bbugungi\b/i,
  /\bertaga\b/i,
  /\bkecha\b/i,

  /\btoday\b/i,
  /\bright now\b/i,
  /\bcurrently today\b/i,
  /\btomorrow\b/i,
  /\byesterday\b/i,
];

function looksTemporary(
  value,
  key = ""
) {
  const clean =
    normalizeText(value);

  if (!clean) {
    return true;
  }

  /*
    Ayrim keylar tabiatan uzoqroq muddatli bo‘lishi mumkin.
    Masalan "current_project" ichida "hozir" so‘zi ishlatilishi
    tabiiy, shuning uchun ularni to‘liq bloklamaymiz.
  */

  const durableKeys =
    new Set([
      "current_project",
      "main_goal",
      "occupation",
      "software_tools",
    ]);

  if (
    durableKeys.has(key)
  ) {
    return false;
  }

  return TEMPORARY_PATTERNS.some(
    (pattern) =>
      pattern.test(clean)
  );
}

/* =========================================================
   CANONICAL MEMORY KEYS
========================================================= */

const CANONICAL_KEY_MAP = {
  name:
    "name",

  full_name:
    "name",

  user_name:
    "name",

  location:
    "location",

  city:
    "location",

  country:
    "location",

  residence:
    "location",

  living_place:
    "location",

  occupation:
    "occupation",

  profession:
    "occupation",

  job:
    "occupation",

  work:
    "occupation",

  profession_software:
    "software_tools",

  software:
    "software_tools",

  software_tool:
    "software_tools",

  software_tools:
    "software_tools",

  used_software:
    "software_tools",

  work_tools:
    "software_tools",

  tools:
    "software_tools",

  current_project:
    "current_project",

  project:
    "current_project",

  active_project:
    "current_project",

  working_project:
    "current_project",

  main_goal:
    "main_goal",

  goal:
    "main_goal",

  objective:
    "main_goal",

  preferred_language:
    "preferred_language",

  language_preference:
    "preferred_language",

  response_language:
    "preferred_language",

  response_style:
    "response_style",

  preferred_response_style:
    "response_style",

  answer_style:
    "response_style",

  favorite:
    "favorite",
};

function canonicalizeMemoryKey(
  key
) {
  const normalized =
    normalizeKey(key);

  if (!normalized) {
    return "";
  }

  return (
    CANONICAL_KEY_MAP[
      normalized
    ] ||
    normalized
  );
}

/* =========================================================
   REGEX FALLBACK
========================================================= */

const MEMORY_RULES = [
  {
    category:
      "identity",

    key:
      "name",

    importance:
      10,

    patterns: [
      /^(?:mening\s+ismim|ismim)\s+(.+)$/i,

      /^meni\s+(.+?)\s+deb\s+chaqir(?:ing|ishingiz mumkin)?$/i,
    ],
  },

  {
    category:
      "identity",

    key:
      "location",

    importance:
      8,

    patterns: [
      /^men\s+(.+?)danman$/i,

      /^men\s+(.+?)da\s+yashayman$/i,

      /^yashash\s+joyim\s+(.+)$/i,
    ],
  },

  {
    category:
      "identity",

    key:
      "occupation",

    importance:
      7,

    patterns: [
      /^men\s+(.+?)\s+bo‘lib\s+ishlayman$/i,

      /^men\s+(.+?)\s+bo'lib\s+ishlayman$/i,

      /^kasbim\s+(.+)$/i,
    ],
  },

  {
    category:
      "preference",

    key:
      "preferred_language",

    importance:
      8,

    patterns: [
      /^men\s+(.+?)\s+tilida\s+javoblarni\s+yoqtiraman$/i,

      /^doim\s+(.+?)\s+tilida\s+javob\s+ber$/i,

      /^menga\s+(.+?)\s+tilida\s+javob\s+ber$/i,
    ],
  },

  {
    category:
      "preference",

    key:
      "response_style",

    importance:
      7,

    patterns: [
      /^javoblarni\s+(.+?)\s+yoz$/i,

      /^men\s+(.+?)\s+javoblarni\s+yoqtiraman$/i,
    ],
  },

  {
    category:
      "project",

    key:
      "current_project",

    importance:
      9,

    patterns: [
      /^men\s+(.+?)\s+loyihasini\s+quryapman$/i,

      /^mening\s+loyiham\s+(.+)$/i,

      /^hozir\s+(.+?)\s+ustida\s+ishlayapman$/i,
    ],
  },

  {
    category:
      "goal",

    key:
      "main_goal",

    importance:
      8,

    patterns: [
      /^mening\s+maqsadim\s+(.+)$/i,

      /^maqsadim\s+(.+)$/i,
    ],
  },
];

function extractRuleBasedCandidates(
  message
) {
  const cleanMessage =
    normalizeText(message);

  if (
    !cleanMessage ||
    isQuestionLike(
      cleanMessage
    ) ||
    containsSensitiveData(
      cleanMessage
    )
  ) {
    return [];
  }

  const candidates = [];

  for (
    const rule of
      MEMORY_RULES
  ) {
    for (
      const pattern of
        rule.patterns
    ) {
      const match =
        cleanMessage.match(
          pattern
        );

      if (!match) {
        continue;
      }

      const value =
        cleanValue(
          match[1] || ""
        );

      const key =
        canonicalizeMemoryKey(
          rule.key
        );

      if (
        !value ||
        !key ||
        containsSensitiveData(
          value
        ) ||
        looksTemporary(
          value,
          key
        )
      ) {
        continue;
      }

      candidates.push({
        action:
          "upsert",

        category:
          rule.category,

        key,

        value,

        importance:
          rule.importance,

        confidence:
          0.95,

        source:
          "rule",
      });

      break;
    }
  }

  return candidates;
}

/* =========================================================
   JSON PARSER
========================================================= */

function extractJsonFromText(
  text
) {
  const cleanText =
    normalizeText(text);

  if (!cleanText) {
    return null;
  }

  try {
    return JSON.parse(
      cleanText
    );
  } catch {
    // davom
  }

  const firstBrace =
    cleanText.indexOf(
      "{"
    );

  const lastBrace =
    cleanText.lastIndexOf(
      "}"
    );

  if (
    firstBrace === -1 ||
    lastBrace === -1 ||
    lastBrace <= firstBrace
  ) {
    return null;
  }

  try {
    return JSON.parse(
      cleanText.slice(
        firstBrace,
        lastBrace + 1
      )
    );
  } catch {
    return null;
  }
}

/* =========================================================
   EXISTING MEMORY FORMAT
========================================================= */

function formatExistingMemories(
  memories = []
) {
  if (
    !Array.isArray(memories) ||
    memories.length === 0
  ) {
    return "Hozircha saqlangan xotira yo‘q.";
  }

  return memories
    .map(
      (memory) =>
        `- ${memory.key}: ${memory.value}`
    )
    .join("\n");
}

/* =========================================================
   AI MEMORY PROMPT
========================================================= */

function createMemoryExtractorPrompt({
  message,
  existingMemories,
}) {
  return `
Sen YordamAI Memory Manager tizimisan.

Maqsad:
foydalanuvchining yangi xabaridan faqat kelajak suhbatlarda foydali bo‘ladigan BARQAROR ma’lumotlarni boshqar.

Mavjud xotiralar:

${formatExistingMemories(
  existingMemories
)}

Yangi foydalanuvchi xabari:

"""${message}"""

Har bir memory uchun action tanla:

1. upsert
   - yangi barqaror fakt
   - eski faktning yangilangan versiyasi
   - ro‘yxatga yangi element qo‘shish

2. remove
   - foydalanuvchi oldingi ma’lumot endi to‘g‘ri emasligini aytsa
   - foydalanuvchi biror vosita/dasturni endi ishlatmasligini aytsa

3. ignore
   - saqlash kerak bo‘lmasa

Faqat kategoriyalar:
- identity
- preference
- project
- goal
- personal
- instruction
- other

Standart keylar:
- name
- location
- occupation
- software_tools
- current_project
- main_goal
- preferred_language
- response_style
- favorite

Misollar:

"Men Toshkentda yashayman."
→ location / upsert / Toshkent

"Men endi Samarqandda yashayman."
→ location / upsert / Samarqand

"Men AutoCAD va KOMPAS-3D ishlataman."
→ software_tools / upsert / AutoCAD, KOMPAS-3D

"Men endi SolidWorks ishlatmayman."
→ software_tools / remove / SolidWorks

"Bugun havo issiq."
→ ignore

"Hozir choy ichyapman."
→ ignore

"Mening parolim abc123."
→ ignore

"API keyim sk-..."
→ ignore

Saqlama:
- parol
- API key
- access token
- refresh token
- JWT
- private key
- PIN
- karta raqami
- CVV/CVC
- autentifikatsiya sirlari
- vaqtinchalik holatlar
- oddiy savollar
- bir martalik topshiriqlar
- model taxminlari
- foydalanuvchi aytmagan faktlar

Muhim:
- foydalanuvchi aytmagan narsani o‘ylab topma
- bir xil ma’no uchun turli key yaratma
- software bilan bog‘liq keylar uchun software_tools ishlat
- project uchun current_project ishlat
- asosiy maqsad uchun main_goal ishlat
- confidence 0 dan 1 gacha
- importance 1 dan 10 gacha
- maksimal ${MAX_MEMORY_CANDIDATES} ta memory

Faqat JSON qaytar.

Format:

{
  "memories": [
    {
      "action": "upsert",
      "category": "identity",
      "key": "location",
      "value": "Samarqand",
      "importance": 8,
      "confidence": 0.98
    }
  ]
}

Agar hech nima saqlanmasa:

{
  "memories": []
}
  `.trim();
}

/* =========================================================
   AI CANDIDATES
========================================================= */

async function extractAiCandidates({
  userId,
  message,
}) {
  const cleanMessage =
    normalizeText(
      message
    ).slice(
      0,
      MAX_INPUT_LENGTH
    );

  if (
    !cleanMessage ||
    isQuestionLike(
      cleanMessage
    ) ||
    containsSensitiveData(
      cleanMessage
    )
  ) {
    return [];
  }

  const existingMemories =
    await getUserMemories(
      userId,
      50
    );

  const resolvedModel =
    resolveModel(
      MEMORY_EXTRACTOR_MODEL_KEY
    );

  const openRouter =
    getOpenRouterClient();

  const completion =
    await openRouter
      .chat
      .completions
      .create({
        model:
          resolvedModel.modelId,

        messages: [
          {
            role:
              "system",

            content:
              "Manage durable user memories. Return valid JSON only.",
          },

          {
            role:
              "user",

            content:
              createMemoryExtractorPrompt({
                message:
                  cleanMessage,

                existingMemories,
              }),
          },
        ],

        temperature:
          0,

        max_tokens:
          800,

        stream:
          false,
      });

  const content =
    completion
      ?.choices?.[0]
      ?.message?.content;

  const parsed =
    extractJsonFromText(
      content
    );

  if (
    !parsed ||
    !Array.isArray(
      parsed.memories
    )
  ) {
    return [];
  }

  const candidates = [];

  for (
    const item of
      parsed.memories
  ) {
    if (
      !item ||
      typeof item !==
        "object"
    ) {
      continue;
    }

    const action =
      [
        "upsert",
        "remove",
        "ignore",
      ].includes(
        item.action
      )
        ? item.action
        : "ignore";

    if (
      action ===
      "ignore"
    ) {
      continue;
    }

    const key =
      canonicalizeMemoryKey(
        item.key
      );

    const value =
      cleanValue(
        item.value
      );

    const category =
      normalizeCategory(
        item.category
      );

    const confidenceValue =
      Number(
        item.confidence
      );

    const confidence =
      Number.isFinite(
        confidenceValue
      )
        ? Math.min(
            Math.max(
              confidenceValue,
              0
            ),
            1
          )
        : 0;

    const importanceValue =
      Number(
        item.importance
      );

    const importance =
      Number.isFinite(
        importanceValue
      )
        ? Math.min(
            Math.max(
              Math.round(
                importanceValue
              ),
              1
            ),
            10
          )
        : 5;

    if (
      !key ||
      !value
    ) {
      continue;
    }

    if (
      confidence <
      MEMORY_MIN_CONFIDENCE
    ) {
      continue;
    }

    if (
      containsSensitiveData(
        value
      )
    ) {
      continue;
    }

    if (
      action ===
        "upsert" &&
      looksTemporary(
        value,
        key
      )
    ) {
      continue;
    }

    candidates.push({
      action,
      category,
      key,
      value,
      importance,
      confidence,
      source:
        "ai",
    });

    if (
      candidates.length >=
      MAX_MEMORY_CANDIDATES
    ) {
      break;
    }
  }

  return candidates;
}

/* =========================================================
   CANDIDATE MERGE
========================================================= */

function mergeCandidates(
  aiCandidates = [],
  ruleCandidates = []
) {
  const map =
    new Map();

  const all = [
    ...ruleCandidates,
    ...aiCandidates,
  ];

  for (
    const candidate of all
  ) {
    if (
      !candidate?.key ||
      !candidate?.value
    ) {
      continue;
    }

    const key =
      canonicalizeMemoryKey(
        candidate.key
      );

    if (!key) {
      continue;
    }

    const normalized = {
      ...candidate,
      key,
    };

    const mapKey =
      `${normalized.action}:${key}`;

    const existing =
      map.get(
        mapKey
      );

    if (!existing) {
      map.set(
        mapKey,
        normalized
      );

      continue;
    }

    if (
      Number(
        normalized.confidence
      ) >
      Number(
        existing.confidence
      )
    ) {
      map.set(
        mapKey,
        normalized
      );
    }
  }

  return [
    ...map.values(),
  ].slice(
    0,
    MAX_MEMORY_CANDIDATES
  );
}

/* =========================================================
   LIST HELPERS
========================================================= */

function parseList(value) {
  return normalizeText(
    value
  )
    .split(
      /\s*(?:,|;|\bva\b|\band\b|\&)\s*/i
    )
    .map(
      (item) =>
        cleanValue(item)
    )
    .filter(Boolean);
}

function uniqueList(
  values = []
) {
  const map =
    new Map();

  for (
    const item of values
  ) {
    const clean =
      cleanValue(item);

    if (!clean) {
      continue;
    }

    const key =
      clean.toLowerCase();

    if (
      !map.has(key)
    ) {
      map.set(
        key,
        clean
      );
    }
  }

  return [
    ...map.values(),
  ];
}

/* =========================================================
   UPSERT
========================================================= */

async function handleUpsert({
  userId,
  candidate,
  conversationId,
  messageId,
}) {
  if (
    candidate.key ===
    "software_tools"
  ) {
    const existing =
      await getMemoryByKey({
        userId,

        key:
          "software_tools",
      });

    const oldTools =
      existing
        ? parseList(
            existing.value
          )
        : [];

    const newTools =
      parseList(
        candidate.value
      );

    const merged =
      uniqueList([
        ...oldTools,
        ...newTools,
      ]);

    if (
      merged.length === 0
    ) {
      return null;
    }

    return saveMemory({
      userId,

      category:
        candidate.category,

      key:
        candidate.key,

      value:
        merged.join(", "),

      sourceConversation:
        conversationId,

      sourceMessage:
        messageId,

      importance:
        candidate.importance,

      confidence:
        candidate.confidence,
    });
  }

  return saveMemory({
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
}

/* =========================================================
   REMOVE
========================================================= */

async function handleRemove({
  userId,
  candidate,
  conversationId,
  messageId,
}) {
  const existing =
    await getMemoryByKey({
      userId,

      key:
        candidate.key,
    });

  if (!existing) {
    return null;
  }

  if (
    candidate.key ===
    "software_tools"
  ) {
    const currentTools =
      parseList(
        existing.value
      );

    const removeTools =
      parseList(
        candidate.value
      ).map(
        (item) =>
          item.toLowerCase()
      );

    const remaining =
      currentTools.filter(
        (tool) =>
          !removeTools.includes(
            tool.toLowerCase()
          )
      );

    if (
      remaining.length === 0
    ) {
      return deactivateMemoryByKey({
        userId,

        key:
          candidate.key,
      });
    }

    return saveMemory({
      userId,

      category:
        existing.category,

      key:
        candidate.key,

      value:
        remaining.join(", "),

      sourceConversation:
        conversationId,

      sourceMessage:
        messageId,

      importance:
        existing.importance,

      confidence:
        candidate.confidence,
    });
  }

  return deactivateMemoryByKey({
    userId,

    key:
      candidate.key,
  });
}

/* =========================================================
   MEMORY CANDIDATES
========================================================= */

async function extractMemoryCandidates({
  userId,
  message,
}) {
  const cleanMessage =
    normalizeText(message);

  if (
    !userId ||
    !cleanMessage
  ) {
    return [];
  }

  if (
    containsSensitiveData(
      cleanMessage
    )
  ) {
    return [];
  }

  if (
    isQuestionLike(
      cleanMessage
    )
  ) {
    return [];
  }

  const ruleCandidates =
    extractRuleBasedCandidates(
      cleanMessage
    );

  let aiCandidates = [];

  try {
    aiCandidates =
      await extractAiCandidates({
        userId,

        message:
          cleanMessage,
      });
  } catch (error) {
    console.error(
      "AI MEMORY V2.3 XATOSI:",
      {
        message:
          error?.message,

        code:
          error?.code,
      }
    );
  }

  return mergeCandidates(
    aiCandidates,
    ruleCandidates
  );
}

/* =========================================================
   SAVE / UPDATE / REMOVE
========================================================= */

async function extractAndSaveMemories({
  userId,
  message,
  conversationId = null,
  messageId = null,
}) {
  if (
    !userId ||
    !message
  ) {
    return [];
  }

  const candidates =
    await extractMemoryCandidates({
      userId,
      message,
    });

  if (
    candidates.length === 0
  ) {
    return [];
  }

  const results = [];

  for (
    const candidate of
      candidates
  ) {
    try {
      let result =
        null;

      if (
        candidate.action ===
        "upsert"
      ) {
        result =
          await handleUpsert({
            userId,
            candidate,
            conversationId,
            messageId,
          });
      }

      if (
        candidate.action ===
        "remove"
      ) {
        result =
          await handleRemove({
            userId,
            candidate,
            conversationId,
            messageId,
          });
      }

      if (result) {
        results.push(
          result
        );
      }
    } catch (error) {
      console.error(
        "MEMORY ACTION XATOSI:",
        {
          action:
            candidate.action,

          key:
            candidate.key,

          message:
            error?.message,
        }
      );
    }
  }

  return results;
}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  canonicalizeMemoryKey,
  containsSensitiveData,
  looksTemporary,
  extractRuleBasedCandidates,
  extractAiCandidates,
  extractMemoryCandidates,
  extractAndSaveMemories,
};