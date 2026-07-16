const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Ism kiritilishi shart"],
      trim: true,
      minlength: [2, "Ism kamida 2 ta belgidan iborat bo‘lishi kerak"],
      maxlength: [60, "Ism 60 ta belgidan oshmasligi kerak"],
    },

    email: {
      type: String,
      required: [true, "Email kiritilishi shart"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "To‘g‘ri email manzil kiriting",
      ],
    },

    password: {
      type: String,
      required: [true, "Parol kiritilishi shart"],
      minlength: [6, "Parol kamida 6 ta belgidan iborat bo‘lishi kerak"],
      select: false,
    },

    avatar: {
      type: String,
      default: "",
      trim: true,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },

    plan: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
      index: true,
    },

    planStartedAt: {
      type: Date,
      default: null,
    },

    planExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    subscriptionStatus: {
      type: String,
      enum: ["inactive", "active", "expired", "cancelled"],
      default: "inactive",
    },

    subscriptionProvider: {
      type: String,
      enum: ["manual", "click", "payme", "stripe", null],
      default: null,
    },

    subscriptionId: {
      type: String,
      default: null,
      trim: true,
    },

    dailyMessageCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    dailyMessageDate: {
      type: Date,
      default: Date.now,
    },

    lastLoginAt: {
      type: Date,
      default: null,
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
    toJSON: {
      transform(document, returnedObject) {
        delete returnedObject.password;
        return returnedObject;
      },
    },
  }
);

userSchema.methods.isPlanExpired = function isPlanExpired() {
  if (this.plan !== "pro") {
    return false;
  }

  if (!this.planExpiresAt) {
    return false;
  }

  return new Date(this.planExpiresAt).getTime() <= Date.now();
};

userSchema.methods.resetExpiredPlan = async function resetExpiredPlan() {
  if (!this.isPlanExpired()) {
    return this;
  }

  this.plan = "free";
  this.subscriptionStatus = "expired";
  this.subscriptionProvider = null;
  this.subscriptionId = null;
  this.planStartedAt = null;
  this.planExpiresAt = null;

  await this.save();

  return this;
};

userSchema.index({
  plan: 1,
  planExpiresAt: 1,
});

module.exports = mongoose.model("User", userSchema);