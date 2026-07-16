const PDF_API_URL =
  "http://localhost:5000/api/pdf/extract";

function getToken() {
  return localStorage.getItem("yordamai_token");
}

export async function uploadPdf(pdfFile) {
  if (!pdfFile) {
    throw new Error("PDF fayl tanlanmagan");
  }

  if (pdfFile.type !== "application/pdf") {
    throw new Error("Faqat PDF fayl yuklash mumkin");
  }

  const maximumSize = 10 * 1024 * 1024;

  if (pdfFile.size > maximumSize) {
    throw new Error(
      "PDF hajmi 10 MB dan katta bo‘lishi mumkin emas"
    );
  }

  const formData = new FormData();

  formData.append("pdf", pdfFile);

  const response = await fetch(PDF_API_URL, {
    method: "POST",

    headers: {
      Authorization: `Bearer ${getToken()}`,
    },

    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
        data.message ||
        "PDF faylni yuklashda xatolik"
    );
  }

  return data;
}