const PLAN_CONFIG = Object.freeze({
  free: {
    key: "free",
    name: "Free",

    description:
      "YordamAI asosiy imkoniyatlaridan bepul foydalanish",

    dailyMessageLimit: 10,

    pdfUploadLimitMb: 5,

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

    dailyMessageLimit: 100,

    pdfUploadLimitMb: 25,

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

module.exports = {
  PLAN_CONFIG,
  DEFAULT_PLAN,
  getPlanConfig,
  getPublicPlans,
};