const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      default: "Yangi chat",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);