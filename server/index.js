require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chat");
const conversationRoutes = require("./routes/conversationRoutes");
const pdfRoutes = require("./routes/pdf");
const planRoutes = require("./routes/planRoutes");

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const MONGO_URI = process.env.MONGO_URI;

/* =========================================================
   EXPRESS SOZLAMALARI
========================================================= */

app.disable("x-powered-by");
app.set("trust proxy", 1);

/* =========================================================
   CORS
========================================================= */

const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const environmentOrigins = String(
  process.env.CLIENT_URLS || process.env.CLIENT_URL || ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...new Set([...defaultOrigins, ...environmentOrigins]),
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const error = new Error(
      `CORS bloklandi: ${origin} manziliga ruxsat berilmagan`
    );

    error.statusCode = 403;
    error.code = "CORS_FORBIDDEN";

    return callback(error);
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With",
  ],

  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

/* =========================================================
   BODY PARSER
========================================================= */

app.use(
  express.json({
    limit: process.env.JSON_BODY_LIMIT || "20mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.URL_ENCODED_BODY_LIMIT || "20mb",
  })
);

/* =========================================================
   XAVFSIZLIK HEADERLARI
========================================================= */

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  next();
});

/* =========================================================
   REQUEST LOG
========================================================= */

if (NODE_ENV !== "test") {
  app.use((req, res, next) => {
    const startedAt = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - startedAt;

      console.log(
        `[${new Date().toISOString()}] ` +
          `${req.method} ${req.originalUrl} ` +
          `${res.statusCode} ${duration}ms`
      );
    });

    next();
  });
}

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/", (req, res) => {
  const databaseConnected =
    mongoose.connection.readyState === 1;

  return res.status(200).json({
    success: true,
    message: "YordamAI Server ishlayapti 🚀",
    environment: NODE_ENV,
    database: databaseConnected
      ? "connected"
      : "disconnected",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  const databaseState = mongoose.connection.readyState;

  const databaseStatuses = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const healthy = databaseState === 1;

  return res.status(healthy ? 200 : 503).json({
    success: healthy,
    service: "YordamAI API",
    status: healthy ? "healthy" : "unhealthy",
    database:
      databaseStatuses[databaseState] || "unknown",
    environment: NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================
   API ROUTES
========================================================= */

app.use("/api/auth", authRoutes);

app.use("/api/chat", chatRoutes);

/*
  Eski frontend /api/messages endpointidan foydalanayotgan
  bo‘lsa ham chat route ishlashi uchun qo‘shimcha manzil.
*/
app.use("/api/messages", chatRoutes);

app.use("/api/conversations", conversationRoutes);

app.use("/api/pdf", pdfRoutes);

app.use("/api/plans", planRoutes);

/* =========================================================
   404 ROUTE
========================================================= */

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    code: "ROUTE_NOT_FOUND",
    message: `API manzil topilmadi: ${req.method} ${req.originalUrl}`,
  });
});

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use((error, req, res, next) => {
  console.error("❌ Server xatosi:", error);

  if (res.headersSent) {
    return next(error);
  }

  if (
    error.code === "CORS_FORBIDDEN" ||
    error.message?.startsWith("CORS bloklandi")
  ) {
    return res.status(403).json({
      success: false,
      code: "CORS_FORBIDDEN",
      message: error.message,
    });
  }

  if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    "body" in error
  ) {
    return res.status(400).json({
      success: false,
      code: "INVALID_JSON",
      message: "Yuborilgan JSON formati noto‘g‘ri",
    });
  }

  if (error.name === "ValidationError") {
    const validationErrors = Object.values(
      error.errors || {}
    ).map((validationError) => validationError.message);

    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message:
        validationErrors[0] ||
        "Ma’lumotlarni tekshirishda xatolik",
      errors: validationErrors,
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      code: "INVALID_ID",
      message: "Noto‘g‘ri ID formati",
    });
  }

  if (error.code === 11000) {
    const duplicateField = Object.keys(
      error.keyPattern || error.keyValue || {}
    )[0];

    return res.status(409).json({
      success: false,
      code: "DUPLICATE_VALUE",
      message:
        duplicateField === "email"
          ? "Bu email bilan foydalanuvchi mavjud"
          : "Bu ma’lumot avval ro‘yxatdan o‘tgan",
    });
  }

  if (error.name === "MulterError") {
    let message = "Fayl yuklashda xatolik";

    if (error.code === "LIMIT_FILE_SIZE") {
      message = "Yuklangan fayl hajmi juda katta";
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Noto‘g‘ri fayl maydoni yuborildi";
    }

    return res.status(400).json({
      success: false,
      code: "FILE_UPLOAD_ERROR",
      message,
    });
  }

  const statusCode =
    Number(error.statusCode || error.status) || 500;

  const isProduction = NODE_ENV === "production";

  return res.status(statusCode).json({
    success: false,
    code: error.code || "SERVER_ERROR",
    message:
      statusCode >= 500 && isProduction
        ? "Serverda ichki xatolik yuz berdi"
        : error.message ||
          "Serverda noma’lum xatolik yuz berdi",
    ...(!isProduction && error.stack
      ? {
          stack: error.stack,
        }
      : {}),
  });
});

/* =========================================================
   MONGODB
========================================================= */

const connectDatabase = async () => {
  if (!MONGO_URI) {
    throw new Error(
      "MONGO_URI .env faylida ko‘rsatilmagan"
    );
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log("🟢 MongoDB muvaffaqiyatli ulandi");
};

mongoose.connection.on("error", (error) => {
  console.error(
    "🔴 MongoDB ulanish xatosi:",
    error.message
  );
});

mongoose.connection.on("disconnected", () => {
  console.warn("🟡 MongoDB bilan aloqa uzildi");
});

mongoose.connection.on("reconnected", () => {
  console.log("🟢 MongoDB qayta ulandi");
});

/* =========================================================
   SERVER START
========================================================= */

let server = null;
let shutdownStarted = false;

const startServer = async () => {
  try {
    await connectDatabase();

    server = app.listen(PORT, () => {
      console.log("");
      console.log("========================================");
      console.log("🚀 YordamAI Server ishga tushdi");
      console.log(`🌍 Manzil: http://localhost:${PORT}`);
      console.log(`🧩 Muhit: ${NODE_ENV}`);
      console.log(`🔐 CORS: ${allowedOrigins.join(", ")}`);
      console.log("========================================");
      console.log("");
    });
  } catch (error) {
    console.error(
      "🔴 Serverni ishga tushirishda xatolik:"
    );
    console.error(error);

    process.exit(1);
  }
};

/* =========================================================
   SERVERNI XAVFSIZ YOPISH
========================================================= */

const shutdown = async (signal) => {
  if (shutdownStarted) {
    return;
  }

  shutdownStarted = true;

  console.log(
    `\n🟡 ${signal} qabul qilindi. Server yopilmoqda...`
  );

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    console.log("🟢 Server xavfsiz yopildi");

    process.exit(0);
  } catch (error) {
    console.error(
      "🔴 Serverni yopishda xatolik:",
      error
    );

    process.exit(1);
  }
};

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

process.on("unhandledRejection", (reason) => {
  console.error(
    "🔴 Unhandled Promise Rejection:",
    reason
  );

  shutdown("UNHANDLED_REJECTION");
});

process.on("uncaughtException", (error) => {
  console.error("🔴 Uncaught Exception:", error);

  process.exit(1);
});

startServer();

module.exports = app;