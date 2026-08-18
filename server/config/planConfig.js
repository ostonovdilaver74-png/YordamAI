/**
 * YordamAI
 * Free / Pro tarif konfiguratsiyasi
 */

const PLAN_CONFIG = Object.freeze({
  free: {
    key: "free",
    name: "Free",

    description:
      "YordamAI asosiy imkoniyatlaridan bepul foydalanish",

    // Kunlik AI so‘rovlar soni
    dailyMessageLimit: 10,

    // AI bitta javobda ishlatishi mumkin bo‘lgan
    // maksimal output token
    maxOutputTokens: 800,

    // PDF yuklash limiti
    pdfUploadLimitMb: 5,

    // Free tarifda ruxsat berilgan AI oilalari
    allowedModelFamilies: [
      "gemini",
      "deepseek",
    ],

    features: [
      "Kuniga 10 ta AI xabar",
      "Gemini modeli",
      "DeepSeek modeli",
      "PDF bilan suhbat",
      "Chat tarixi",
    ],
  },

  pro: {
    key: "pro",
    name: "Pro",

    description:
      "Barcha AI modellar va yuqori limitlar",

    // Kunlik AI so‘rovlar soni
    dailyMessageLimit: 100,

    // Pro foydalanuvchi uchun uzunroq AI javoblari
    maxOutputTokens: 3000,

    // PDF yuklash limiti
    pdfUploadLimitMb: 25,

    // Pro tarifda barcha asosiy AI oilalari
    allowedModelFamilies: [
      "gpt",
      "openai",
      "gemini",
      "claude",
      "anthropic",
      "deepseek",
    ],

    features: [
      "Kuniga 100 ta AI xabar",
      "Uzunroq va batafsil AI javoblari",
      "GPT modellari",
      "Claude modellari",
      "Gemini modellari",
      "DeepSeek modellari",
      "Kattaroq PDF fayllar",
      "Ustuvor AI javoblari",
      "Chat tarixi",
    ],
  },
});

const DEFAULT_PLAN = "free";

/* =========================================================
   PLAN CONFIG
========================================================= */

const getPlanConfig = (
  planName = DEFAULT_PLAN
) => {
  const key = String(
    planName || DEFAULT_PLAN
  )
    .trim()
    .toLowerCase();

  return (
    PLAN_CONFIG[key] ||
    PLAN_CONFIG[DEFAULT_PLAN]
  );
};

/* =========================================================
   PUBLIC PLAN DATA
========================================================= */

const getPublicPlans = () => {
  return Object.values(
    PLAN_CONFIG
  ).map((plan) => ({
    key: plan.key,

    name: plan.name,

    description:
      plan.description,

    dailyMessageLimit:
      plan.dailyMessageLimit,

    maxOutputTokens:
      plan.maxOutputTokens,

    pdfUploadLimitMb:
      plan.pdfUploadLimitMb,

    allowedModelFamilies: [
      ...plan.allowedModelFamilies,
    ],

    features: [
      ...plan.features,
    ],
  }));
};

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  PLAN_CONFIG,
  DEFAULT_PLAN,
  getPlanConfig,
  getPublicPlans,
};