const {
  refreshUserPlan,
  getUserPlanInformation,
  checkModelAccess,
  incrementDailyUsage,
} = require("../services/planService");

const extractRequestedModel = (req) => {
  return (
    req.body?.model ||
    req.body?.modelId ||
    req.body?.selectedModel ||
    req.body?.aiModel ||
    ""
  );
};

const enforceAiPlan = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Avtorizatsiya talab qilinadi",
      });
    }

    await refreshUserPlan(req.user);

    const planInfo = getUserPlanInformation(req.user);

    if (planInfo.remainingMessages <= 0) {
      return res.status(429).json({
        success: false,
        code: "DAILY_LIMIT_REACHED",
        message:
          "Bugungi AI xabar limitingiz tugadi. Pro tarifga o‘ting yoki ertaga davom eting.",
        plan: planInfo,
      });
    }

    const requestedModel = extractRequestedModel(req);
    const modelAccess = checkModelAccess(req.user, requestedModel);

    if (!modelAccess.allowed) {
      return res.status(403).json({
        success: false,
        code: "MODEL_REQUIRES_PRO",
        message: `${modelAccess.modelFamily} modeli faqat Pro tarifda mavjud`,
        requestedModel,
        modelFamily: modelAccess.modelFamily,
        plan: planInfo,
      });
    }

    req.planInfo = planInfo;
    req.modelFamily = modelAccess.modelFamily;

    const originalJson = res.json.bind(res);
    let usageRecorded = false;

    res.json = async (responseBody) => {
      const requestSuccessful =
        res.statusCode >= 200 &&
        res.statusCode < 400 &&
        responseBody?.success !== false;

      if (requestSuccessful && !usageRecorded) {
        usageRecorded = true;

        try {
          const updatedPlan = await incrementDailyUsage(req.user._id);

          if (
            responseBody &&
            typeof responseBody === "object" &&
            !Array.isArray(responseBody)
          ) {
            responseBody.usage = {
              dailyMessageLimit: updatedPlan.dailyMessageLimit,
              dailyMessageCount: updatedPlan.dailyMessageCount,
              remainingMessages: updatedPlan.remainingMessages,
              nextResetAt: updatedPlan.nextResetAt,
              currentPlan: updatedPlan.currentPlan,
            };
          }
        } catch (error) {
          console.error("AI foydalanishni hisoblashda xatolik:", error);
        }
      }

      return originalJson(responseBody);
    };

    return next();
  } catch (error) {
    console.error("Plan middleware xatosi:", error);

    return res.status(500).json({
      success: false,
      message: "Tarif va limitni tekshirishda server xatosi",
    });
  }
};

module.exports = {
  enforceAiPlan,
};