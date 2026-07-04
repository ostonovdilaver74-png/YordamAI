require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const chatRoute = require("./routes/chat");
const conversationRoutes = require("./routes/conversationRoutes");

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/conversations", conversationRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoute);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "YordamAI Server ishlayapti 🚀",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server ishga tushdi: http://localhost:${PORT}`);
});