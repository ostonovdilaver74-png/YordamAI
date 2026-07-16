const OpenAI = require("openai");
const AI_MODELS = require("../config/aiModels");

function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY server/.env faylida topilmadi"
    );
  }

  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,

    defaultHeaders: {
      "HTTP-Referer":
        process.env.APP_URL || "http://localhost:5173",

      "X-OpenRouter-Title":
        process.env.APP_NAME || "YordamAI",
    },

    timeout: 60_000,
    maxRetries: 2,
  });
}

function normalizeMessages(messages = []) {
  return messages
    .filter(
      (message) =>
        message &&
        typeof message.content === "string" &&
        message.content.trim()
    )
    .map((message) => ({
      role:
        message.role === "assistant"
          ? "assistant"
          : "user",

      content: message.content.trim(),
    }));
}

function resolveModel(modelKey) {
  const normalizedKey = String(
    modelKey || "GEMINI"
  ).toUpperCase();

  return AI_MODELS[normalizedKey] || AI_MODELS.GEMINI;
}

async function generateAIReply(
  messages = [],
  modelKey = "GEMINI"
) {
  const conversationMessages =
    normalizeMessages(messages);

  if (conversationMessages.length === 0) {
    throw new Error(
      "AI uchun yuboriladigan xabarlar topilmadi"
    );
  }

  const openrouter = getOpenRouterClient();
  const selectedModel = resolveModel(modelKey);

  const completion =
    await openrouter.chat.completions.create({
      model: selectedModel,

      messages: [
        {
          role: "system",
          content: `
Sen YordamAI nomli professional AI yordamchisan.

Asosiy qoidalar:
- Foydalanuvchi qaysi tilda yozsa, o‘sha tilda javob ber.
- O‘zbek tilida tabiiy, sodda va tushunarli yoz.
- Javoblarni foydali va aniq qil.
- Keraksiz takrorlardan qoch.
- Dasturlash savollarida ishlaydigan kod yoz.
- Kodlarni Markdown kod bloklarida ko‘rsat.
- Bilmagan ma’lumotni o‘ylab topma.
- Ma’lumot yetarli bo‘lmasa, buni ochiq ayt.
          `.trim(),
        },

        ...conversationMessages,
      ],

      temperature: 0.7,
      max_tokens: 1500,
    });

  const reply =
    completion.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error(
      "OpenRouter modeli bo‘sh javob qaytardi"
    );
  }

  return {
    reply,
    model: selectedModel,
  };
}

module.exports = {
  generateAIReply,
};