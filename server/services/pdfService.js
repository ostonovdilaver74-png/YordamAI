const { PDFParse } = require("pdf-parse");

const MAX_PDF_TEXT_LENGTH = 30_000;

async function extractPdfText(pdfBuffer) {
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    throw new Error("PDF fayl ma’lumoti topilmadi");
  }

  const parser = new PDFParse({
    data: pdfBuffer,
  });

  try {
    const result = await parser.getText();

    const cleanText = String(result.text || "")
      .replace(/\u0000/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!cleanText) {
      throw new Error(
        "PDF ichidan matn topilmadi. Fayl rasm yoki skaner ko‘rinishida bo‘lishi mumkin."
      );
    }

    return {
      text: cleanText.slice(0, MAX_PDF_TEXT_LENGTH),
      originalLength: cleanText.length,
      truncated: cleanText.length > MAX_PDF_TEXT_LENGTH,
      pages: result.total || result.pages?.length || null,
    };
  } finally {
    await parser.destroy();
  }
}

module.exports = {
  extractPdfText,
};