const User = require("../models/User");
const { getPublicPlans } = require("../config/planConfig");
const {
  refreshUserPlan,
  getUserPlanInformation,
  assignPlan,
  cancelSubscription,
} = require("../services/planService");

const getPlans = async (req, res) => {
  return res.status(200).json({
    success: true,
    plans: getPublicPlans(),
  });
};

const getMyPlan = async (req, res) => {
  try {
    await refreshUserPlan(req.user);

    return res.status(200).json({
      success: true,
      plan: getUserPlanInformation(req.user),
    });
  } catch (error) {
    console.error("Foydalanuvchi tarifini olishda xatolik:", error);

    return res.status(500).json({
      success: false,
      message: "Tarif ma’lumotlarini olishda server xatosi",
    });
  }
};

const updateUserPlanByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      plan,
      durationDays = 30,
      provider = "manual",
      subscriptionId = null,
    } = req.body;

    const user = await assignPlan({
      userId,
      plan,
      durationDays,
      provider,
      subscriptionId,
    });

    return res.status(200).json({
      success: true,
      message:
        plan === "pro"
          ? "Foydalanuvchiga Pro tarif muvaffaqiyatli berildi"
          : "Foydalanuvchi Free tarifga o‘tkazildi",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionProvider: user.subscriptionProvider,
        planStartedAt: user.planStartedAt,
        planExpiresAt: user.planExpiresAt,
      },
    });
  } catch (error) {
    console.error("Admin tarif yangilash xatosi:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Tarifni yangilashda server xatosi",
    });
  }
};

const cancelUserPlanByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await cancelSubscription(userId);

    return res.status(200).json({
      success: true,
      message: "Foydalanuvchi Pro obunasi bekor qilindi",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
      },
    });
  } catch (error) {
    console.error("Admin obunani bekor qilish xatosi:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Obunani bekor qilishda server xatosi",
    });
  }
};

const getUsersByPlan = async (req, res) => {
  try {
    const requestedPlan = req.query.plan;

    const filter = {};

    if (requestedPlan && ["free", "pro"].includes(requestedPlan)) {
      filter.plan = requestedPlan;
    }

    const users = await User.find(filter)
      .select(
        "name email role plan subscriptionStatus subscriptionProvider planStartedAt planExpiresAt dailyMessageCount dailyMessageDate createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(500);

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Tarif bo‘yicha foydalanuvchilar xatosi:", error);

    return res.status(500).json({
      success: false,
      message: "Foydalanuvchilarni olishda server xatosi",
    });
  }
};

module.exports = {
  getPlans,
  getMyPlan,
  updateUserPlanByAdmin,
  cancelUserPlanByAdmin,
  getUsersByPlan,
};