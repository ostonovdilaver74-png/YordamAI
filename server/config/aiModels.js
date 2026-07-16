/**
 * YordamAI
 * AI Model Configuration
 */

const AI_MODELS = Object.freeze({
  /* =========================
     TEXT MODELS
  ========================= */

  GPT: {
    id: "openai/gpt-4.1-mini",
    provider: "OpenAI",
    name: "GPT-4.1 Mini",

    vision: true,
    streaming: true,
    reasoning: true,

    maxTokens: 16384,
  },

  GEMINI: {
    id: "google/gemini-2.5-flash",
    provider: "Google",
    name: "Gemini 2.5 Flash",

    vision: true,
    streaming: true,
    reasoning: true,

    maxTokens: 65536,
  },

  CLAUDE: {
    id: "anthropic/claude-3.5-sonnet",
    provider: "Anthropic",
    name: "Claude 3.5 Sonnet",

    vision: true,
    streaming: true,
    reasoning: true,

    maxTokens: 8192,
  },

  DEEPSEEK: {
    id: "deepseek/deepseek-chat-v3-0324",
    provider: "DeepSeek",
    name: "DeepSeek V3",

    vision: false,
    streaming: true,
    reasoning: true,

    maxTokens: 16384,
  },
});

/* ======================================
   Helpers
====================================== */

function getModel(modelKey = "GEMINI") {
  const key = String(modelKey)
    .trim()
    .toUpperCase();

  return (
    AI_MODELS[key] ||
    AI_MODELS.GEMINI
  );
}

function supportsVision(modelKey) {
  return Boolean(
    getModel(modelKey).vision
  );
}

function supportsStreaming(modelKey) {
  return Boolean(
    getModel(modelKey).streaming
  );
}

function supportsReasoning(modelKey) {
  return Boolean(
    getModel(modelKey).reasoning
  );
}

module.exports = {
  AI_MODELS,
  getModel,
  supportsVision,
  supportsStreaming,
  supportsReasoning,
};