const express = require("express");
const mongoose = require("mongoose");

const {
  protect,
} = require("../middleware/authMiddleware");

const {
  getUserMemories,
  deleteMemory,
  clearUserMemories,
} = require("../services/memoryService");

const router = express.Router();

/* =========================================================
   HELPERS
========================================================= */

function getErrorStatus(error) {
  const statusCode = Number(
    error?.statusCode ||
      error?.status
  );

  if (
    Number.isInteger(statusCode) &&
    statusCode >= 400 &&
    statusCode <= 599
  ) {
    return statusCode;
  }

  return 500;
}

function getErrorMessage(
  error,
  fallback = "Memory bilan ishlashda xatolik"
) {
  return (
    error?.message ||
    fallback
  );
}

/* =========================================================
   XOTIRALARNI OLISH
   GET /api/memory
========================================================= */

router.get(
  "/",
  protect,
  async (req, res) => {
    try {
      const memories =
        await getUserMemories(
          req.user._id,
          100
        );

      return res.status(200).json({
        success: true,

        count:
          memories.length,

        memories,
      });
    } catch (error) {
      console.error(
        "MEMORY LIST XATOSI:",
        error
      );

      return res
        .status(
          getErrorStatus(error)
        )
        .json({
          success: false,

          code:
            error?.code ||
            "MEMORY_LIST_FAILED",

          message:
            getErrorMessage(
              error,
              "Xotiralarni olishda xatolik yuz berdi"
            ),
        });
    }
  }
);

/* =========================================================
   BITTA XOTIRANI O‘CHIRISH
   DELETE /api/memory/:id
========================================================= */

router.delete(
  "/:id",
  protect,
  async (req, res) => {
    try {
      const memoryId =
        String(
          req.params.id || ""
        ).trim();

      if (
        !mongoose.Types.ObjectId.isValid(
          memoryId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            code:
              "INVALID_MEMORY_ID",

            message:
              "Memory ID formati noto‘g‘ri",
          });
      }

      const deletedMemory =
        await deleteMemory({
          userId:
            req.user._id,

          memoryId,
        });

      if (!deletedMemory) {
        return res
          .status(404)
          .json({
            success: false,

            code:
              "MEMORY_NOT_FOUND",

            message:
              "Xotira topilmadi",
          });
      }

      return res.status(200).json({
        success: true,

        message:
          "Xotira muvaffaqiyatli o‘chirildi",

        memory:
          deletedMemory,
      });
    } catch (error) {
      console.error(
        "MEMORY DELETE XATOSI:",
        error
      );

      return res
        .status(
          getErrorStatus(error)
        )
        .json({
          success: false,

          code:
            error?.code ||
            "MEMORY_DELETE_FAILED",

          message:
            getErrorMessage(
              error,
              "Xotirani o‘chirishda xatolik yuz berdi"
            ),
        });
    }
  }
);

/* =========================================================
   BARCHA XOTIRALARNI TOZALASH
   DELETE /api/memory
========================================================= */

router.delete(
  "/",
  protect,
  async (req, res) => {
    try {
      const result =
        await clearUserMemories(
          req.user._id
        );

      return res.status(200).json({
        success: true,

        message:
          "Barcha xotiralar tozalandi",

        deletedCount:
          Number(
            result?.deletedCount || 0
          ),
      });
    } catch (error) {
      console.error(
        "MEMORY CLEAR XATOSI:",
        error
      );

      return res
        .status(
          getErrorStatus(error)
        )
        .json({
          success: false,

          code:
            error?.code ||
            "MEMORY_CLEAR_FAILED",

          message:
            getErrorMessage(
              error,
              "Xotiralarni tozalashda xatolik yuz berdi"
            ),
        });
    }
  }
);

module.exports = router;