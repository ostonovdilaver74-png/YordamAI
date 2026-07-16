const jwt = require("jsonwebtoken");
const User = require("../models/User");

const getTokenFromHeader = (authorizationHeader) => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/);

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

const protect = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Avtorizatsiya tokeni topilmadi",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET .env faylida mavjud emas");

      return res.status(500).json({
        success: false,
        message: "Server konfiguratsiyasida xatolik",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Sessiya muddati tugagan. Qayta kiring",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Noto‘g‘ri avtorizatsiya tokeni",
      });
    }

    const userId = decoded.userId || decoded.id || decoded._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Token tarkibida foydalanuvchi aniqlanmadi",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Foydalanuvchi topilmadi",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Foydalanuvchi hisobi bloklangan",
      });
    }

    if (user.isPlanExpired()) {
      await user.resetExpiredPlan();
    }

    req.user = user;
    req.userId = user._id.toString();

    return next();
  } catch (error) {
    console.error("Auth middleware xatosi:", error);

    return res.status(500).json({
      success: false,
      message: "Avtorizatsiyani tekshirishda server xatosi",
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Avtorizatsiya talab qilinadi",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Bu amal faqat administrator uchun mavjud",
    });
  }

  return next();
};

module.exports = {
  protect,
  requireAdmin,
};