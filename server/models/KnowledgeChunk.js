const mongoose = require("mongoose");

const knowledgeChunkSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KnowledgeDocument",
      required: true,
      index: true,
    },

    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 12000,
    },

    startChar: {
      type: Number,
      default: null,
    },

    endChar: {
      type: Number,
      default: null,
    },

    tokenEstimate: {
      type: Number,
      default: 0,
      min: 0,
    },

    embedding: {
      type: [Number],
      default: undefined,
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

knowledgeChunkSchema.index(
  {
    document: 1,
    chunkIndex: 1,
  },
  {
    unique: true,
  }
);

knowledgeChunkSchema.index({
  user: 1,
  document: 1,
  isActive: 1,
});

module.exports = mongoose.model(
  "KnowledgeChunk",
  knowledgeChunkSchema
);
