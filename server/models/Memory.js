const mongoose = require("mongoose");

const memorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    category: {
      type: String,
      enum: [
        "identity",
        "preference",
        "project",
        "goal",
        "personal",
        "instruction",
        "other",
      ],
      default: "other",
      index: true,
    },

    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    value: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    sourceConversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },

    sourceMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    importance: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
      index: true,
    },

    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 1,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    lastUsedAt: {
      type: Date,
      default: null,
    },

    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

memorySchema.index(
  {
    user: 1,
    key: 1,
  },
  {
    unique: true,
  }
);

memorySchema.index({
  user: 1,
  isActive: 1,
  importance: -1,
  updatedAt: -1,
});

memorySchema.pre("save", function normalizeMemory(next) {
  this.key = String(this.key || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  this.value = String(this.value || "").trim();

  next();
});

module.exports = mongoose.model("Memory", memorySchema);