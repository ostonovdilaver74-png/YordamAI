import {
  useMemo,
  useRef,
  useState,
} from "react";

import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

import { askAI } from "../services/ai";

const initialForm = {
  fullName: "",
  profession: "",
  email: "",
  phone: "",
  address: "",
  summary: "",
  skills: "",
  experience: "",
  education: "",
  languages: "",
};

function splitLines(value) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeText(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function extractAIReply(result) {
  return normalizeText(
    result?.reply ||
      result?.assistantMessage?.content ||
      result?.message?.content ||
      result?.data?.reply ||
      ""
  );
}

function escapeRegex(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function extractSection(
  text,
  sectionNames
) {
  const cleanText =
    normalizeText(text);

  if (!cleanText) {
    return "";
  }

  const escapedNames =
    sectionNames.map(
      escapeRegex
    );

  const allHeadings = [
    "Kasb",
    "Lavozim",
    "Professional profil",
    "Profil",
    "Qisqacha ma’lumot",
    "Qisqacha ma'lumot",
    "Ko‘nikmalar",
    "Ko'nikmalar",
    "Tajriba",
    "Ish tajribasi",
    "Ta’lim",
    "Ta'lim",
    "Tillar",
  ];

  const escapedHeadings =
    allHeadings.map(
      escapeRegex
    );

  const sectionPattern =
    new RegExp(
      `(?:^|\\n)\\s*(?:${escapedNames.join(
        "|"
      )})\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:${escapedHeadings.join(
        "|"
      )})\\s*:|$)`,
      "i"
    );

  const match =
    cleanText.match(
      sectionPattern
    );

  return (
    match?.[1]?.trim() ||
    ""
  );
}

function cleanListSection(value) {
  return normalizeText(value)
    .split("\n")
    .map((line) =>
      line
        .replace(
          /^\s*[-•*–—]\s*/,
          ""
        )
        .replace(
          /^\s*\d+[.)]\s*/,
          ""
        )
        .trim()
    )
    .filter(Boolean)
    .join("\n");
}

function createSafeFileName(value) {
  const name =
    normalizeText(value) ||
    "YordamAI-CV";

  const safeName = name
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9-_]+/g,
      "-"
    )
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return (
    safeName ||
    "YordamAI-CV"
  );
}

export default function CV() {
  const [form, setForm] =
    useState(initialForm);

  const [loadingAI, setLoadingAI] =
    useState(false);

  const [
    exportingPdf,
    setExportingPdf,
  ] = useState(false);

  const [aiError, setAiError] =
    useState("");

  const [
    aiSuccess,
    setAiSuccess,
  ] = useState("");

  const cvPreviewRef =
    useRef(null);

  const skills = useMemo(
    () => splitLines(form.skills),
    [form.skills]
  );

  const experience = useMemo(
    () =>
      splitLines(
        form.experience
      ),
    [form.experience]
  );

  const education = useMemo(
    () =>
      splitLines(
        form.education
      ),
    [form.education]
  );

  const languages = useMemo(
    () =>
      splitLines(
        form.languages
      ),
    [form.languages]
  );

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (currentForm) => ({
        ...currentForm,
        [name]: value,
      })
    );

    setAiError("");
    setAiSuccess("");
  }

  function clearForm() {
    const confirmed =
      window.confirm(
        "Barcha CV ma’lumotlarini tozalashni xohlaysizmi?"
      );

    if (!confirmed) {
      return;
    }

    setForm(initialForm);
    setAiError("");
    setAiSuccess("");
  }

  async function generateWithAI() {
    const sourceInformation = [
      form.profession &&
        `Kasb yoki maqsad: ${form.profession}`,

      form.summary &&
        `Foydalanuvchi haqida: ${form.summary}`,

      form.skills &&
        `Mavjud ko‘nikmalar:\n${form.skills}`,

      form.experience &&
        `Mavjud tajriba:\n${form.experience}`,

      form.education &&
        `Mavjud ta’lim:\n${form.education}`,

      form.languages &&
        `Mavjud tillar:\n${form.languages}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    if (
      !sourceInformation.trim()
    ) {
      setAiError(
        "Avval professional profil, kasb yoki boshqa CV ma’lumotlaridan kamida bittasini kiriting."
      );

      return;
    }

    try {
      setLoadingAI(true);
      setAiError("");
      setAiSuccess("");

      const prompt = `
Sen professional HR mutaxassisi va CV yozish bo‘yicha ekspertsan.

Quyidagi foydalanuvchi ma’lumotlari asosida professional, aniq va ish beruvchiga mos CV matnini O‘zbek tilida tayyorla.

MUHIM QOIDALAR:
- Mavjud bo‘lmagan tajriba, kompaniya, universitet, sertifikat yoki til darajasini o‘ylab topma.
- Ma’lumot yetarli bo‘lmasa, umumiy va ehtiyotkor shaklda yoz.
- Professional profil 3–5 gapdan iborat bo‘lsin.
- Ko‘nikmalar, tajriba, ta’lim va tillar har biri yangi qatorda yozilsin.
- Hech qanday Markdown sarlavha yoki kod bloki ishlatma.
- Natijani aynan quyidagi formatda qaytar.

Kasb:
...

Professional profil:
...

Ko‘nikmalar:
...

Tajriba:
...

Ta’lim:
...

Tillar:
...

FOYDALANUVCHI MA’LUMOTLARI:

${sourceInformation}
      `.trim();

      const result =
        await askAI(
          prompt,
          null,
          "GEMINI",
          "",
          [],
          {
            webSearch: false,
          }
        );

      const aiReply =
        extractAIReply(result);

      if (!aiReply) {
        throw new Error(
          "AI bo‘sh javob qaytardi"
        );
      }

      const profession =
        extractSection(
          aiReply,
          [
            "Kasb",
            "Lavozim",
          ]
        );

      const summary =
        extractSection(
          aiReply,
          [
            "Professional profil",
            "Profil",
            "Qisqacha ma’lumot",
            "Qisqacha ma'lumot",
          ]
        );

      const generatedSkills =
        cleanListSection(
          extractSection(
            aiReply,
            [
              "Ko‘nikmalar",
              "Ko'nikmalar",
            ]
          )
        );

      const generatedExperience =
        cleanListSection(
          extractSection(
            aiReply,
            [
              "Tajriba",
              "Ish tajribasi",
            ]
          )
        );

      const generatedEducation =
        cleanListSection(
          extractSection(
            aiReply,
            [
              "Ta’lim",
              "Ta'lim",
            ]
          )
        );

      const generatedLanguages =
        cleanListSection(
          extractSection(
            aiReply,
            ["Tillar"]
          )
        );

      setForm(
        (currentForm) => ({
          ...currentForm,

          profession:
            profession ||
            currentForm.profession,

          summary:
            summary ||
            currentForm.summary,

          skills:
            generatedSkills ||
            currentForm.skills,

          experience:
            generatedExperience ||
            currentForm.experience,

          education:
            generatedEducation ||
            currentForm.education,

          languages:
            generatedLanguages ||
            currentForm.languages,
        })
      );

      setAiSuccess(
        "AI CV ma’lumotlarini professional shaklda tayyorladi."
      );
    } catch (error) {
      console.error(
        "AI CV YARATISH XATOSI:",
        error
      );

      setAiError(
        error?.message ||
          "AI yordamida CV yaratishda xatolik yuz berdi."
      );
    } finally {
      setLoadingAI(false);
    }
  }

  async function downloadPdf() {
    if (!cvPreviewRef.current) {
      setAiError(
        "CV preview topilmadi."
      );

      return;
    }

    try {
      setExportingPdf(true);
      setAiError("");
      setAiSuccess("");

      const canvas =
        await html2canvas(
          cvPreviewRef.current,
          {
            scale: 2,
            useCORS: true,
            backgroundColor:
              "#ffffff",
            logging: false,
            windowWidth:
              cvPreviewRef.current
                .scrollWidth,
            windowHeight:
              cvPreviewRef.current
                .scrollHeight,
          }
        );

      const imageData =
        canvas.toDataURL(
          "image/jpeg",
          0.95
        );

      const pdf = new jsPDF({
        orientation:
          "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth =
        pdf.internal.pageSize
          .getWidth();

      const pageHeight =
        pdf.internal.pageSize
          .getHeight();

      const margin = 6;

      const printableWidth =
        pageWidth -
        margin * 2;

      const printableHeight =
        pageHeight -
        margin * 2;

      const imageHeight =
        (canvas.height *
          printableWidth) /
        canvas.width;

      let remainingHeight =
        imageHeight;

      let positionY = margin;

      pdf.addImage(
        imageData,
        "JPEG",
        margin,
        positionY,
        printableWidth,
        imageHeight,
        undefined,
        "FAST"
      );

      remainingHeight -=
        printableHeight;

      while (
        remainingHeight > 0
      ) {
        positionY =
          margin -
          (imageHeight -
            remainingHeight);

        pdf.addPage();

        pdf.addImage(
          imageData,
          "JPEG",
          margin,
          positionY,
          printableWidth,
          imageHeight,
          undefined,
          "FAST"
        );

        remainingHeight -=
          printableHeight;
      }

      const safeName =
        createSafeFileName(
          form.fullName
        );

      pdf.save(
        `${safeName}-CV.pdf`
      );

      setAiSuccess(
        "CV PDF formatida yuklab olindi."
      );
    } catch (error) {
      console.error(
        "CV PDF XATOSI:",
        error
      );

      setAiError(
        "CV’ni PDF formatida yaratishda xatolik yuz berdi."
      );
    } finally {
      setExportingPdf(false);
    }
  }

  const isBusy =
    loadingAI ||
    exportingPdf;

  return (
    <section className="mx-auto w-full max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            📄 AI CV Generator
          </h1>

          <p className="mt-2 text-slate-500">
            Professional va
            tartibli rezyume
            yarating.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={
              generateWithAI
            }
            disabled={isBusy}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAI
              ? "🤖 AI yozmoqda..."
              : "🤖 AI bilan yaratish"}
          </button>

          <button
            type="button"
            onClick={
              downloadPdf
            }
            disabled={isBusy}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exportingPdf
              ? "📄 PDF tayyorlanmoqda..."
              : "📄 PDF yuklab olish"}
          </button>

          <button
            type="button"
            onClick={clearForm}
            disabled={isBusy}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            🗑 Tozalash
          </button>
        </div>
      </div>

      {aiError && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {aiError}
        </div>
      )}

      {aiSuccess && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
          ✅ {aiSuccess}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
        <div className="space-y-6">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Asosiy ma’lumotlar
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Ism, kasb va
              aloqa ma’lumotlarini
              kiriting.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Ism va familiya
                </span>

                <input
                  name="fullName"
                  value={
                    form.fullName
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Masalan: Dilmurod Karimov"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Kasb yoki lavozim
                </span>

                <input
                  name="profession"
                  value={
                    form.profession
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Masalan: Frontend Developer"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Email
                </span>

                <input
                  type="email"
                  name="email"
                  value={
                    form.email
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="email@example.com"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Telefon
                </span>

                <input
                  name="phone"
                  value={
                    form.phone
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="+998 90 123 45 67"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Manzil
                </span>

                <input
                  name="address"
                  value={
                    form.address
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Masalan: Toshkent, O‘zbekiston"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Professional profil
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              O‘zingiz haqingizda
              qisqacha yozing.
              AI ushbu ma’lumot
              asosida qolgan
              bo‘limlarni yaxshilaydi.
            </p>

            <textarea
              name="summary"
              value={
                form.summary
              }
              onChange={
                handleChange
              }
              rows={6}
              placeholder="Masalan: Men 2 yillik tajribaga ega Frontend dasturchiman. React, JavaScript, Tailwind CSS va REST API bilan ishlayman..."
              className="mt-5 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Tajriba va ta’lim
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Har bir ma’lumotni
              yangi qatordan
              kiriting.
            </p>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Ish tajribasi
                </span>

                <textarea
                  name="experience"
                  value={
                    form.experience
                  }
                  onChange={
                    handleChange
                  }
                  rows={9}
                  placeholder={`Frontend Developer — ABC Company, 2024–2026\nReact va REST API bilan ishladim\nSayt tezligini yaxshiladim`}
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Ta’lim
                </span>

                <textarea
                  name="education"
                  value={
                    form.education
                  }
                  onChange={
                    handleChange
                  }
                  rows={9}
                  placeholder={`TATU — Dasturiy injiniring, 2022–2026\nFrontend Development kursi, 2025`}
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Ko‘nikmalar va tillar
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Har bir ko‘nikma
              yoki tilni yangi
              qatordan yozing.
            </p>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Ko‘nikmalar
                </span>

                <textarea
                  name="skills"
                  value={
                    form.skills
                  }
                  onChange={
                    handleChange
                  }
                  rows={8}
                  placeholder={`React\nJavaScript\nTailwind CSS\nGit\nREST API`}
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Tillar
                </span>

                <textarea
                  name="languages"
                  value={
                    form.languages
                  }
                  onChange={
                    handleChange
                  }
                  rows={8}
                  placeholder={`O‘zbek tili — Ona tili\nRus tili — O‘rta\nIngliz tili — B1`}
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
          </article>
        </div>

        <div className="xl:sticky xl:top-0 xl:self-start">
          <article
            ref={cvPreviewRef}
            className="min-h-[700px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="bg-slate-900 px-7 py-8 text-white">
              <h2 className="break-words text-3xl font-extrabold">
                {form.fullName ||
                  "Ism Familiya"}
              </h2>

              <p className="mt-2 text-lg font-semibold text-blue-300">
                {form.profession ||
                  "Kasbingiz"}
              </p>

              <div className="mt-6 grid gap-2 text-sm text-slate-200">
                <p>
                  📧{" "}
                  {form.email ||
                    "email@example.com"}
                </p>

                <p>
                  📱{" "}
                  {form.phone ||
                    "+998 90 123 45 67"}
                </p>

                <p>
                  📍{" "}
                  {form.address ||
                    "Toshkent, O‘zbekiston"}
                </p>
              </div>
            </div>

            <div className="space-y-7 p-7">
              <section>
                <h3 className="border-b border-slate-200 pb-2 text-sm font-extrabold uppercase tracking-wider text-slate-900">
                  Professional profil
                </h3>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                  {form.summary ||
                    "Bu yerda sizning professional profilingiz ko‘rinadi."}
                </p>
              </section>

              <section>
                <h3 className="border-b border-slate-200 pb-2 text-sm font-extrabold uppercase tracking-wider text-slate-900">
                  Ish tajribasi
                </h3>

                {experience.length >
                0 ? (
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    {experience.map(
                      (
                        item,
                        index
                      ) => (
                        <li
                          key={`${item}-${index}`}
                          className="flex gap-2"
                        >
                          <span className="text-blue-600">
                            •
                          </span>

                          <span>
                            {item}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    Ish tajribasi
                    kiritilmagan.
                  </p>
                )}
              </section>

              <section>
                <h3 className="border-b border-slate-200 pb-2 text-sm font-extrabold uppercase tracking-wider text-slate-900">
                  Ta’lim
                </h3>

                {education.length >
                0 ? (
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    {education.map(
                      (
                        item,
                        index
                      ) => (
                        <li
                          key={`${item}-${index}`}
                          className="flex gap-2"
                        >
                          <span className="text-blue-600">
                            •
                          </span>

                          <span>
                            {item}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    Ta’lim ma’lumoti
                    kiritilmagan.
                  </p>
                )}
              </section>

              <section>
                <h3 className="border-b border-slate-200 pb-2 text-sm font-extrabold uppercase tracking-wider text-slate-900">
                  Ko‘nikmalar
                </h3>

                {skills.length >
                0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skills.map(
                      (
                        skill,
                        index
                      ) => (
                        <span
                          key={`${skill}-${index}`}
                          className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                        >
                          {skill}
                        </span>
                      )
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    Ko‘nikmalar
                    kiritilmagan.
                  </p>
                )}
              </section>

              <section>
                <h3 className="border-b border-slate-200 pb-2 text-sm font-extrabold uppercase tracking-wider text-slate-900">
                  Tillar
                </h3>

                {languages.length >
                0 ? (
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    {languages.map(
                      (
                        language,
                        index
                      ) => (
                        <li
                          key={`${language}-${index}`}
                          className="flex gap-2"
                        >
                          <span className="text-blue-600">
                            •
                          </span>

                          <span>
                            {language}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    Tillar
                    kiritilmagan.
                  </p>
                )}
              </section>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}