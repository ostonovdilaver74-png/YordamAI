const express = require("express");
const mongoose = require("mongoose");

const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

/* =========================================================
   BARCHA CHATLARNI OLISH
   GET /api/conversations
========================================================= */

router.get("/", protect, async (req, res) => {
  try {
    const conversations =
      await Conversation.find({
        user: req.user._id,
      })
        .sort({
          updatedAt: -1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    console.error(
      "CHATLARNI OLISH XATOSI:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Chat tarixini olishda server xatosi",
    });
  }
});

/* =========================================================
   YANGI CHAT YARATISH
   POST /api/conversations
========================================================= */

router.post("/", protect, async (req, res) => {
  try {
    const title =
      typeof req.body?.title === "string" &&
      req.body.title.trim()
        ? req.body.title.trim().slice(0, 80)
        : "Yangi chat";

    const conversation =
      await Conversation.create({
        user: req.user._id,
        title,
      });

    return res.status(201).json({
      success: true,
      message: "Yangi chat yaratildi",
      conversation,
    });
  } catch (error) {
    console.error(
      "YANGI CHAT YARATISH XATOSI:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Yangi chat yaratishda server xatosi",
    });
  }
});

/* =========================================================
   BITTA CHAT VA XABARLARINI OLISH
   GET /api/conversations/:id/messages
========================================================= */

router.get(
  "/:id/messages",
  protect,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          success: false,
          message: "Chat ID formati noto‘g‘ri",
        });
      }

      const conversation =
        await Conversation.findOne({
          _id: id,
          user: req.user._id,
        }).lean();

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Chat topilmadi",
        });
      }

      const messages = await Message.find({
        conversation: id,
      })
        .sort({
          createdAt: 1,
        })
        .lean();

      return res.status(200).json({
        success: true,
        conversation,
        messages,
      });
    } catch (error) {
      console.error(
        "CHATNI OCHISH XATOSI:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Chat xabarlarini olishda server xatosi",
      });
    }
  }
);

/* =========================================================
   CHATNI O‘CHIRISH
   DELETE /api/conversations/:id
========================================================= */

router.delete(
  "/:id",
  protect,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          success: false,
          message: "Chat ID formati noto‘g‘ri",
        });
      }

      const conversation =
        await Conversation.findOne({
          _id: id,
          user: req.user._id,
        });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Chat topilmadi",
        });
      }

      await Message.deleteMany({
        conversation: id,
      });

      await Conversation.deleteOne({
        _id: id,
        user: req.user._id,
      });

      return res.status(200).json({
        success: true,
        message: "Chat o‘chirildi",
        conversationId: id,
      });
    } catch (error) {
      console.error(
        "CHATNI O‘CHIRISH XATOSI:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Chatni o‘chirishda server xatosi",
      });
    }
  }
);

module.exports = router;