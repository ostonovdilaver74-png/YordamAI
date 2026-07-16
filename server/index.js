require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chat");
const conversationRoutes = require("./routes/conversationRoutes");
const pdfRoutes = require("./routes/pdf");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// Asosiy test route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "YordamAI Server ishlayapti 🚀",
  });
});

// API route'lar
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/pdf", pdfRoutes);

// Noma'lum route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route topilmadi",
  });
});

// Global server xatolari
app.use((error, req, res, next) => {
  console.error("GLOBAL SERVER XATOSI:", error);

  res.status(error.status || 500).json({
    success: false,
    error:
      error.message ||
      "Serverda kutilmagan xatolik yuz berdi",
  });
});

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI server/.env faylida topilmadi"
      );
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("🟢 MongoDB muvaffaqiyatli ulandi");

    app.listen(PORT, () => {
      console.log(
        `✅ Server ishga tushdi: http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "🔴 Serverni ishga tushirish xatosi:",
      error.message
    );

    process.exit(1);
  }
}

startServer();