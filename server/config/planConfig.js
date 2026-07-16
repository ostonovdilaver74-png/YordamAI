const PLAN_CONFIG = Object.freeze({
  free: {
    key: "free",
    name: "Free",
    description: "YordamAI asosiy imkoniyatlaridan bepul foydalanish",
    dailyMessageLimit: 20,
    pdfUploadLimitMb: 5,
    allowedModelFamilies: ["gemini", "deepseek"],
    features: [
      "Kuniga 20 ta AI xabar",
      "Gemini modeli",
      "DeepSeek modeli",
      "PDF bilan suhbat",
      "Chat tarixi",
    ],
  },

  pro: {
    key: "pro",
    name: "Pro",
    description: "Barcha AI modellar va yuqori limitlar",
    dailyMessageLimit: 500,
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
      "Kuniga 500 ta AI xabar",
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

const getPlanConfig = (planName = DEFAULT_PLAN) => {
  return PLAN_CONFIG[planName] || PLAN_CONFIG[DEFAULT_PLAN];
};

const getPublicPlans = () => {
  return Object.values(PLAN_CONFIG).map((plan) => ({
    key: plan.key,
    name: plan.name,
    description: plan.description,
    dailyMessageLimit: plan.dailyMessageLimit,
    pdfUploadLimitMb: plan.pdfUploadLimitMb,
    allowedModelFamilies: plan.allowedModelFamilies,
    features: plan.features,
  }));
};

module.exports = {
  PLAN_CONFIG,
  DEFAULT_PLAN,
  getPlanConfig,
  getPublicPlans,
};