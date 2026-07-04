const express = require("express");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Message kerak",
      });
    }

    return res.json({
      success: true,
      reply: `# YordamAI javobi\n\nSiz yozdingiz: **${message}**\n\nHozircha backend test rejimida ishlayapti.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Server xatosi",
    });
  }
});

module.exports = router;