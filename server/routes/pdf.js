const express = require("express");
const multer = require("multer");

const { protect } = require("../middleware/authMiddleware");
const { extractPdfText } = require("../services/pdfService");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (req, file, callback) => {
    const isPdf =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return callback(
        new Error("Faqat PDF fayl yuklash mumkin")
      );
    }

    callback(null, true);
  },
});

router.post(
  "/extract",
  protect,
  upload.single("pdf"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "PDF fayl tanlanmagan",
        });
      }

      const result = await extractPdfText(req.file.buffer);

      return res.json({
        success: true,

        file: {
          name: req.file.originalname,
          size: req.file.size,
          pages: result.pages,
        },

        document: {
          text: result.text,
          originalLength: result.originalLength,
          truncated: result.truncated,
        },
      });
    } catch (error) {
      console.error("PDF o‘qish xatosi:", error);

      return res.status(400).json({
        success: false,
        error:
          error.message ||
          "PDF faylni o‘qishda xatolik yuz berdi",
      });
    }
  }
);

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        error:
          "PDF hajmi juda katta. Eng ko‘pi 10 MB bo‘lishi mumkin.",
      });
    }

    return res.status(400).json({
      success: false,
      error: `Fayl yuklash xatosi: ${error.message}`,
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  next();
});

module.exports = router;