const mongoose =
  require("mongoose");

const User =
  require("../models/User");

const ProRequest =
  require("../models/ProRequest");

const {
  getPublicPlans,
} = require("../config/planConfig");

const {
  refreshUserPlan,
  getUserPlanInformation,
  assignPlan,
  cancelSubscription,
} = require("../services/planService");

/* =========================================================
   HELPERS
========================================================= */

function createControllerError(
  message,
  statusCode = 500,
  code = "PLAN_CONTROLLER_ERROR"
) {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  error.code =
    code;

  return error;
}

function normalizeText(
  value,
  maxLength = 1_000
) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function normalizeDurationDays(
  value
) {
  const durationDays =
    Number(value);

  if (
    !Number.isFinite(
      durationDays
    )
  ) {
    return 30;
  }

  return Math.min(
    Math.max(
      Math.trunc(
        durationDays
      ),
      1
    ),
    365
  );
}

function normalizePrice(
  value
) {
  const price =
    Number(value);

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    return 49_000;
  }

  return Math.trunc(price);
}

function getErrorStatus(
  error
) {
  const statusCode =
    Number(
      error?.statusCode ||
        error?.status
    );

  if (
    Number.isInteger(
      statusCode
    ) &&
    statusCode >= 400 &&
    statusCode <= 599
  ) {
    return statusCode;
  }

  return 500;
}

function serializeProRequest(
  request
) {
  if (!request) {
    return null;
  }

  return {
    id:
      request._id,

    user:
      request.user,

    status:
      request.status,

    plan:
      request.plan,

    durationDays:
      request.durationDays,

    price:
      request.price,

    currency:
      request.currency,

    provider:
      request.provider,

    userNote:
      request.userNote,

    adminNote:
      request.adminNote,

    reviewedBy:
      request.reviewedBy,

    reviewedAt:
      request.reviewedAt,

    approvedAt:
      request.approvedAt,

    rejectedAt:
      request.rejectedAt,

    createdAt:
      request.createdAt,

    updatedAt:
      request.updatedAt,
  };
}

/* =========================================================
   OMMAVIY TARIFLAR
========================================================= */

const getPlans =
  async (req, res) => {
    return res
      .status(200)
      .json({
        success: true,

        plans:
          getPublicPlans(),
      });
  };

/* =========================================================
   FOYDALANUVCHI TARIFI
========================================================= */

const getMyPlan =
  async (req, res) => {
    try {
      await refreshUserPlan(
        req.user
      );

      return res
        .status(200)
        .json({
          success: true,

          plan:
            getUserPlanInformation(
              req.user
            ),
        });
    } catch (error) {
      console.error(
        "Foydalanuvchi tarifini olishda xatolik:",
        error
      );

      return res
        .status(
          getErrorStatus(
            error
          )
        )
        .json({
          success: false,

          code:
            error.code ||
            "GET_PLAN_FAILED",

          message:
            error.message ||
            "Tarif ma’lumotlarini olishda server xatosi",
        });
    }
  };

/* =========================================================
   PRO SO‘ROV YARATISH
========================================================= */

const createProRequest =
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.user._id
        );

      if (!user) {
        throw createControllerError(
          "Foydalanuvchi topilmadi",
          404,
          "USER_NOT_FOUND"
        );
      }

      await refreshUserPlan(
        user
      );

      if (
        user.plan === "pro"
      ) {
        throw createControllerError(
          "Siz allaqachon Pro tarifdasiz",
          409,
          "ALREADY_PRO"
        );
      }

      const existingRequest =
        await ProRequest.findOne({
          user:
            user._id,

          status:
            "pending",
        });

      if (existingRequest) {
        return res
          .status(200)
          .json({
            success: true,

            alreadyExists: true,

            message:
              "Pro tarif uchun so‘rovingiz avval yuborilgan",

            request:
              serializeProRequest(
                existingRequest
              ),
          });
      }

      const proRequest =
        await ProRequest.create({
          user:
            user._id,

          status:
            "pending",

          plan:
            "pro",

          durationDays:
            normalizeDurationDays(
              req.body
                ?.durationDays
            ),

          price:
            normalizePrice(
              req.body?.price
            ),

          currency:
            normalizeText(
              req.body
                ?.currency ||
                "UZS",
              10
            ).toUpperCase(),

          provider:
            normalizeText(
              req.body
                ?.provider ||
                "manual",
              50
            ),

          userNote:
            normalizeText(
              req.body
                ?.userNote
            ),
        });

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Pro tarif uchun so‘rov muvaffaqiyatli yuborildi",

          request:
            serializeProRequest(
              proRequest
            ),
        });
    } catch (error) {
      console.error(
        "Pro so‘rov yaratish xatosi:",
        error
      );

      return res
        .status(
          getErrorStatus(
            error
          )
        )
        .json({
          success: false,

          code:
            error.code ||
            "CREATE_PRO_REQUEST_FAILED",

          message:
            error.message ||
            "Pro so‘rov yuborishda server xatosi",
        });
    }
  };

/* =========================================================
   MENING PRO SO‘ROVIM
========================================================= */

const getMyProRequest =
  async (req, res) => {
    try {
      const proRequest =
        await ProRequest.findOne({
          user:
            req.user._id,
        })
          .sort({
            createdAt: -1,
          })
          .lean();

      return res
        .status(200)
        .json({
          success: true,

          request:
            proRequest ||
            null,
        });
    } catch (error) {
      console.error(
        "Pro so‘rovni olish xatosi:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          code:
            "GET_PRO_REQUEST_FAILED",

          message:
            "Pro so‘rov ma’lumotlarini olishda server xatosi",
        });
    }
  };

/* =========================================================
   ADMIN — PRO SO‘ROVLAR
========================================================= */

const getProRequestsByAdmin =
  async (req, res) => {
    try {
      const requestedStatus =
        normalizeText(
          req.query?.status,
          30
        );

      const filter = {};

      if (
        [
          "pending",
          "approved",
          "rejected",
          "cancelled",
        ].includes(
          requestedStatus
        )
      ) {
        filter.status =
          requestedStatus;
      }

      const requests =
        await ProRequest.find(
          filter
        )
          .populate(
            "user",
            "name email role plan subscriptionStatus"
          )
          .populate(
            "reviewedBy",
            "name email role"
          )
          .sort({
            createdAt: -1,
          })
          .limit(500);

      return res
        .status(200)
        .json({
          success: true,

          count:
            requests.length,

          requests,
        });
    } catch (error) {
      console.error(
        "Admin Pro so‘rovlar xatosi:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          code:
            "GET_PRO_REQUESTS_FAILED",

          message:
            "Pro so‘rovlarni olishda server xatosi",
        });
    }
  };

/* =========================================================
   ADMIN — PRO SO‘ROVNI TASDIQLASH
========================================================= */

const approveProRequestByAdmin =
  async (req, res) => {
    try {
      const {
        requestId,
      } = req.params;

      if (
        !mongoose.Types.ObjectId
          .isValid(
            requestId
          )
      ) {
        throw createControllerError(
          "Pro so‘rov ID formati noto‘g‘ri",
          400,
          "INVALID_PRO_REQUEST_ID"
        );
      }

      const proRequest =
        await ProRequest.findById(
          requestId
        );

      if (!proRequest) {
        throw createControllerError(
          "Pro so‘rov topilmadi",
          404,
          "PRO_REQUEST_NOT_FOUND"
        );
      }

      if (
        proRequest.status ===
        "approved"
      ) {
        throw createControllerError(
          "Bu Pro so‘rov avval tasdiqlangan",
          409,
          "PRO_REQUEST_ALREADY_APPROVED"
        );
      }

      if (
        proRequest.status !==
        "pending"
      ) {
        throw createControllerError(
          "Faqat kutilayotgan Pro so‘rovni tasdiqlash mumkin",
          409,
          "PRO_REQUEST_NOT_PENDING"
        );
      }

      const durationDays =
        normalizeDurationDays(
          req.body
            ?.durationDays ||
            proRequest
              .durationDays
        );

      const provider =
        normalizeText(
          req.body
            ?.provider ||
            proRequest
              .provider ||
            "manual",
          50
        );

      const subscriptionId =
        normalizeText(
          req.body
            ?.subscriptionId,
          200
        ) || null;

      const user =
        await assignPlan({
          userId:
            proRequest.user,

          plan:
            "pro",

          durationDays,

          provider,

          subscriptionId,
        });

      const now =
        new Date();

      proRequest.status =
        "approved";

      proRequest.durationDays =
        durationDays;

      proRequest.provider =
        provider;

      proRequest.adminNote =
        normalizeText(
          req.body
            ?.adminNote
        );

      proRequest.reviewedBy =
        req.user._id;

      proRequest.reviewedAt =
        now;

      proRequest.approvedAt =
        now;

      proRequest.rejectedAt =
        null;

      await proRequest.save();

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Pro so‘rov tasdiqlandi va foydalanuvchiga Pro tarif berildi",

          request:
            serializeProRequest(
              proRequest
            ),

          user: {
            id:
              user._id,

            name:
              user.name,

            email:
              user.email,

            role:
              user.role,

            plan:
              user.plan,

            subscriptionStatus:
              user.subscriptionStatus,

            subscriptionProvider:
              user.subscriptionProvider,

            planStartedAt:
              user.planStartedAt,

            planExpiresAt:
              user.planExpiresAt,
          },
        });
    } catch (error) {
      console.error(
        "Admin Pro tasdiqlash xatosi:",
        error
      );

      return res
        .status(
          getErrorStatus(
            error
          )
        )
        .json({
          success: false,

          code:
            error.code ||
            "APPROVE_PRO_REQUEST_FAILED",

          message:
            error.message ||
            "Pro so‘rovni tasdiqlashda server xatosi",
        });
    }
  };

/* =========================================================
   ADMIN — PRO SO‘ROVNI RAD ETISH
========================================================= */

const rejectProRequestByAdmin =
  async (req, res) => {
    try {
      const {
        requestId,
      } = req.params;

      if (
        !mongoose.Types.ObjectId
          .isValid(
            requestId
          )
      ) {
        throw createControllerError(
          "Pro so‘rov ID formati noto‘g‘ri",
          400,
          "INVALID_PRO_REQUEST_ID"
        );
      }

      const proRequest =
        await ProRequest.findById(
          requestId
        );

      if (!proRequest) {
        throw createControllerError(
          "Pro so‘rov topilmadi",
          404,
          "PRO_REQUEST_NOT_FOUND"
        );
      }

      if (
        proRequest.status !==
        "pending"
      ) {
        throw createControllerError(
          "Faqat kutilayotgan Pro so‘rovni rad etish mumkin",
          409,
          "PRO_REQUEST_NOT_PENDING"
        );
      }

      const now =
        new Date();

      proRequest.status =
        "rejected";

      proRequest.adminNote =
        normalizeText(
          req.body
            ?.adminNote
        );

      proRequest.reviewedBy =
        req.user._id;

      proRequest.reviewedAt =
        now;

      proRequest.rejectedAt =
        now;

      proRequest.approvedAt =
        null;

      await proRequest.save();

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Pro so‘rov rad etildi",

          request:
            serializeProRequest(
              proRequest
            ),
        });
    } catch (error) {
      console.error(
        "Admin Pro rad etish xatosi:",
        error
      );

      return res
        .status(
          getErrorStatus(
            error
          )
        )
        .json({
          success: false,

          code:
            error.code ||
            "REJECT_PRO_REQUEST_FAILED",

          message:
            error.message ||
            "Pro so‘rovni rad etishda server xatosi",
        });
    }
  };

/* =========================================================
   ADMIN — TARIFNI YANGILASH
========================================================= */

const updateUserPlanByAdmin =
  async (req, res) => {
    try {
      const {
        userId,
      } = req.params;

      const {
        plan,
        durationDays = 30,
        provider = "manual",
        subscriptionId = null,
      } = req.body;

      const user =
        await assignPlan({
          userId,
          plan,
          durationDays,
          provider,
          subscriptionId,
        });

      return res
        .status(200)
        .json({
          success: true,

          message:
            plan === "pro"
              ? "Foydalanuvchiga Pro tarif muvaffaqiyatli berildi"
              : "Foydalanuvchi Free tarifga o‘tkazildi",

          user: {
            id:
              user._id,

            name:
              user.name,

            email:
              user.email,

            role:
              user.role,

            plan:
              user.plan,

            subscriptionStatus:
              user.subscriptionStatus,

            subscriptionProvider:
              user.subscriptionProvider,

            planStartedAt:
              user.planStartedAt,

            planExpiresAt:
              user.planExpiresAt,
          },
        });
    } catch (error) {
      console.error(
        "Admin tarif yangilash xatosi:",
        error
      );

      return res
        .status(
          getErrorStatus(
            error
          )
        )
        .json({
          success: false,

          code:
            error.code ||
            "UPDATE_USER_PLAN_FAILED",

          message:
            error.message ||
            "Tarifni yangilashda server xatosi",
        });
    }
  };

/* =========================================================
   ADMIN — OBUNANI BEKOR QILISH
========================================================= */

const cancelUserPlanByAdmin =
  async (req, res) => {
    try {
      const {
        userId,
      } = req.params;

      const user =
        await cancelSubscription(
          userId
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Foydalanuvchi Pro obunasi bekor qilindi",

          user: {
            id:
              user._id,

            name:
              user.name,

            email:
              user.email,

            plan:
              user.plan,

            subscriptionStatus:
              user.subscriptionStatus,
          },
        });
    } catch (error) {
      console.error(
        "Admin obunani bekor qilish xatosi:",
        error
      );

      return res
        .status(
          getErrorStatus(
            error
          )
        )
        .json({
          success: false,

          code:
            error.code ||
            "CANCEL_PLAN_FAILED",

          message:
            error.message ||
            "Obunani bekor qilishda server xatosi",
        });
    }
  };

/* =========================================================
   ADMIN — FOYDALANUVCHILAR
========================================================= */

const getUsersByPlan =
  async (req, res) => {
    try {
      const requestedPlan =
        req.query.plan;

      const filter = {};

      if (
        requestedPlan &&
        [
          "free",
          "pro",
        ].includes(
          requestedPlan
        )
      ) {
        filter.plan =
          requestedPlan;
      }

      const users =
        await User.find(
          filter
        )
          .select(
            "name email role plan subscriptionStatus subscriptionProvider planStartedAt planExpiresAt dailyMessageCount dailyMessageDate createdAt"
          )
          .sort({
            createdAt: -1,
          })
          .limit(500);

      return res
        .status(200)
        .json({
          success: true,

          count:
            users.length,

          users,
        });
    } catch (error) {
      console.error(
        "Tarif bo‘yicha foydalanuvchilar xatosi:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          code:
            "GET_USERS_BY_PLAN_FAILED",

          message:
            "Foydalanuvchilarni olishda server xatosi",
        });
    }
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getPlans,
  getMyPlan,
  createProRequest,
  getMyProRequest,
  getProRequestsByAdmin,
  approveProRequestByAdmin,
  rejectProRequestByAdmin,
  updateUserPlanByAdmin,
  cancelUserPlanByAdmin,
  getUsersByPlan,
};