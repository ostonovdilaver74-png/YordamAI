const User = require("../models/User");
const { getPlanConfig } = require("../config/planConfig");
const {
  isSameUtcDay,
  getNextUtcResetDate,
} = require("../utils/dateUtils");

const normalizeModelFamily = (modelValue = "") => {
  const model = String(modelValue).trim().toLowerCase();

  if (!model) {
    return "unknown";
  }

  if (
    model.includes("gpt") ||
    model.includes("openai") ||
    model.includes("o1") ||
    model.includes("o3") ||
    model.includes("o4")
  ) {
    return "gpt";
  }

  if (model.includes("claude") || model.includes("anthropic")) {
    return "claude";
  }

  if (model.includes("gemini") || model.includes("google")) {
    return "gemini";
  }

  if (model.includes("deepseek")) {
    return "deepseek";
  }

  return "unknown";
};

const resetDailyUsageIfNeeded = async (user) => {
  const now = new Date();

  if (isSameUtcDay(user.dailyMessageDate, now)) {
    return user;
  }

  user.dailyMessageCount = 0;
  user.dailyMessageDate = now;

  await user.save();

  return user;
};

const refreshUserPlan = async (user) => {
  if (user.isPlanExpired()) {
    await user.resetExpiredPlan();
  }

  await resetDailyUsageIfNeeded(user);

  return user;
};

const getUserPlanInformation = (user) => {
  const plan = getPlanConfig(user.plan);
  const usedMessages = Number(user.dailyMessageCount || 0);
  const remainingMessages = Math.max(
    plan.dailyMessageLimit - usedMessages,
    0
  );

  return {
    currentPlan: user.plan,
    role: user.role,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionProvider: user.subscriptionProvider,
    planStartedAt: user.planStartedAt,
    planExpiresAt: user.planExpiresAt,
    dailyMessageLimit: plan.dailyMessageLimit,
    dailyMessageCount: usedMessages,
    remainingMessages,
    pdfUploadLimitMb: plan.pdfUploadLimitMb,
    allowedModelFamilies: plan.allowedModelFamilies,
    features: plan.features,
    nextResetAt: getNextUtcResetDate(),
  };
};

const checkModelAccess = (user, requestedModel) => {
  const plan = getPlanConfig(user.plan);
  const modelFamily = normalizeModelFamily(requestedModel);

  if (modelFamily === "unknown") {
    return {
      allowed: true,
      modelFamily,
    };
  }

  const allowed = plan.allowedModelFamilies.includes(modelFamily);

  return {
    allowed,
    modelFamily,
  };
};

const incrementDailyUsage = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("Foydalanuvchi topilmadi");
  }

  await refreshUserPlan(user);

  const plan = getPlanConfig(user.plan);

  if (user.dailyMessageCount >= plan.dailyMessageLimit) {
    const error = new Error("Kunlik xabar limiti tugagan");
    error.statusCode = 429;
    throw error;
  }

  user.dailyMessageCount += 1;
  user.dailyMessageDate = new Date();

  await user.save();

  return getUserPlanInformation(user);
};

const assignPlan = async ({
  userId,
  plan,
  durationDays,
  provider = "manual",
  subscriptionId = null,
}) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("Foydalanuvchi topilmadi");
    error.statusCode = 404;
    throw error;
  }

  if (!["free", "pro"].includes(plan)) {
    const error = new Error("Noto‘g‘ri tarif turi");
    error.statusCode = 400;
    throw error;
  }

  if (plan === "free") {
    user.plan = "free";
    user.planStartedAt = null;
    user.planExpiresAt = null;
    user.subscriptionStatus = "inactive";
    user.subscriptionProvider = null;
    user.subscriptionId = null;

    await user.save();

    return user;
  }

  const parsedDuration = Number(durationDays);

  if (
    !Number.isInteger(parsedDuration) ||
    parsedDuration < 1 ||
    parsedDuration > 3650
  ) {
    const error = new Error(
      "Pro tarif muddati 1 kundan 3650 kungacha bo‘lishi kerak"
    );
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const baseDate =
    user.plan === "pro" &&
    user.planExpiresAt &&
    new Date(user.planExpiresAt).getTime() > now.getTime()
      ? new Date(user.planExpiresAt)
      : now;

  const expiresAt = new Date(baseDate);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + parsedDuration);

  user.plan = "pro";
  user.planStartedAt = user.planStartedAt || now;
  user.planExpiresAt = expiresAt;
  user.subscriptionStatus = "active";
  user.subscriptionProvider = provider;
  user.subscriptionId = subscriptionId;

  await user.save();

  return user;
};

const cancelSubscription = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("Foydalanuvchi topilmadi");
    error.statusCode = 404;
    throw error;
  }

  user.plan = "free";
  user.planStartedAt = null;
  user.planExpiresAt = null;
  user.subscriptionStatus = "cancelled";
  user.subscriptionProvider = null;
  user.subscriptionId = null;

  await user.save();

  return user;
};

module.exports = {
  normalizeModelFamily,
  resetDailyUsageIfNeeded,
  refreshUserPlan,
  getUserPlanInformation,
  checkModelAccess,
  incrementDailyUsage,
  assignPlan,
  cancelSubscription,
};