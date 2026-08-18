const mongoose = require("mongoose");

const knowledgeDocumentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },

    originalName: {
      type: String,
      trim: true,
      maxlength: 255,
      default: "",
    },

    mimeType: {
      type: String,
      trim: true,
      default: "application/pdf",
    },

    size: {
      type: Number,
      default: 0,
      min: 0,
    },

    pages: {
      type: Number,
      default: null,
    },

    textLength: {
      type: Number,
      default: 0,
      min: 0,
    },

    chunkCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "processing",
        "ready",
        "failed",
      ],
      default: "processing",
      index: true,
    },

    errorMessage: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

knowledgeDocumentSchema.index({
  user: 1,
  status: 1,
  updatedAt: -1,
});

module.exports = mongoose.model(
  "KnowledgeDocument",
  knowledgeDocumentSchema
);
