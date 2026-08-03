import {
  useMemo,
  useState,
} from "react";

import { askAI } from "../services/ai";

const LANGUAGES = [
  {
    code: "auto",
    label: "Avtomatik aniqlash",
  },
  {
    code: "uz",
    label: "O‘zbek tili",
  },
  {
    code: "ru",
    label: "Rus tili",
  },
  {
    code: "en",
    label: "Ingliz tili",
  },
  {
    code: "tr",
    label: "Turk tili",
  },
  {
    code: "de",
    label: "Nemis tili",
  },
  {
    code: "fr",
    label: "Fransuz tili",
  },
  {
    code: "es",
    label: "Ispan tili",
  },
  {
    code: "ar",
    label: "Arab tili",
  },
  {
    code: "zh",
    label: "Xitoy tili",
  },
];

function getLanguageLabel(code) {
  return (
    LANGUAGES.find(
      (language) =>
        language.code === code
    )?.label || code
  );
}

function extractAIReply(result) {
  return String(
    result?.reply ||
      result?.assistantMessage
        ?.content ||
      result?.message?.content ||
      result?.data?.reply ||
      ""
  ).trim();
}

export default function Translate() {
  const [
    sourceLanguage,
    setSourceLanguage,
  ] = useState("auto");

  const [
    targetLanguage,
    setTargetLanguage,
  ] = useState("uz");

  const [
    sourceText,
    setSourceText,
  ] = useState("");

  const [
    translatedText,
    setTranslatedText,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const sourceCount =
    useMemo(
      () => sourceText.length,
      [sourceText]
    );

  const canSwap =
    sourceLanguage !== "auto";

  function handleSwapLanguages() {
    if (
      loading ||
      !canSwap
    ) {
      return;
    }

    setSourceLanguage(
      targetLanguage
    );

    setTargetLanguage(
      sourceLanguage
    );

    setSourceText(
      translatedText
    );

    setTranslatedText(
      sourceText
    );

    setError("");
  }

  function handleClear() {
    setSourceText("");
    setTranslatedText("");
    setError("");
    setCopied(false);
  }

  async function handleTranslate() {
    const cleanText =
      sourceText.trim();

    if (!cleanText) {
      setError(
        "Tarjima qilish uchun matn kiriting."
      );

      return;
    }

    if (
      sourceLanguage !== "auto" &&
      sourceLanguage ===
        targetLanguage
    ) {
      setError(
        "Manba va tarjima tillari bir xil bo‘lmasligi kerak."
      );

      return;
    }

    try {
      setLoading(true);
      setError("");
      setCopied(false);

      const sourceLabel =
        sourceLanguage === "auto"
          ? "avtomatik aniqlangan til"
          : getLanguageLabel(
              sourceLanguage
            );

      const targetLabel =
        getLanguageLabel(
          targetLanguage
        );

      const prompt = `
Sen professional tarjimonsan.

Quyidagi matnni ${sourceLabel}dan ${targetLabel}ga tarjima qil.

QOIDALAR:
- Faqat tarjima natijasini qaytar.
- Izoh, sarlavha yoki qo‘shimcha gap yozma.
- Mazmun, uslub va ohangni saqla.
- Ismlar, brendlar va texnik atamalarni noto‘g‘ri o‘zgartirma.
- Matnda paragraf yoki ro‘yxat bo‘lsa, tuzilishini saqla.

MATN:

${cleanText}
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

      const reply =
        extractAIReply(result);

      if (!reply) {
        throw new Error(
          "AI bo‘sh tarjima qaytardi"
        );
      }

      setTranslatedText(
        reply
      );
    } catch (translateError) {
      console.error(
        "TARJIMA XATOSI:",
        translateError
      );

      setError(
        translateError?.message ||
          "Tarjima qilishda xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyTranslation() {
    if (!translatedText) {
      return;
    }

    try {
      await navigator.clipboard
        .writeText(
          translatedText
        );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (copyError) {
      console.error(
        "Tarjimani nusxalash xatosi:",
        copyError
      );

      setError(
        "Tarjimani nusxalab bo‘lmadi."
      );
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          🌍 AI Tarjimon
        </h1>

        <p className="mt-2 text-slate-500">
          Matnlarni sun’iy
          intellekt yordamida
          tabiiy va aniq tarjima
          qiling.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1fr_auto_1fr]">
          <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Manba tili
              </span>

              <select
                value={
                  sourceLanguage
                }
                onChange={(event) =>
                  setSourceLanguage(
                    event.target.value
                  )
                }
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              >
                {LANGUAGES.map(
                  (language) => (
                    <option
                      key={
                        language.code
                      }
                      value={
                        language.code
                      }
                    >
                      {
                        language.label
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <textarea
              value={sourceText}
              onChange={(event) => {
                setSourceText(
                  event.target.value
                );

                setError("");
              }}
              rows={16}
              maxLength={10_000}
              placeholder="Tarjima qilinadigan matnni kiriting..."
              disabled={loading}
              className="mt-4 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            />

            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
              <span>
                {sourceCount} / 10000
              </span>

              <button
                type="button"
                onClick={
                  handleClear
                }
                disabled={
                  loading ||
                  (!sourceText &&
                    !translatedText)
                }
                className="font-semibold text-slate-500 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Tozalash
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center border-b border-slate-200 px-4 py-3 lg:border-b-0 lg:border-r">
            <button
              type="button"
              onClick={
                handleSwapLanguages
              }
              disabled={
                loading ||
                !canSwap
              }
              title="Tillarni almashtirish"
              aria-label="Tillarni almashtirish"
              className="grid h-11 w-11 place-items-center rounded-full border border-slate-300 bg-white text-lg shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ⇄
            </button>
          </div>

          <div className="p-5">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Tarjima tili
              </span>

              <select
                value={
                  targetLanguage
                }
                onChange={(event) =>
                  setTargetLanguage(
                    event.target.value
                  )
                }
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              >
                {LANGUAGES.filter(
                  (language) =>
                    language.code !==
                    "auto"
                ).map(
                  (language) => (
                    <option
                      key={
                        language.code
                      }
                      value={
                        language.code
                      }
                    >
                      {
                        language.label
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <div className="relative mt-4 min-h-[416px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              {translatedText ? (
                <p className="whitespace-pre-wrap text-base leading-7 text-slate-900">
                  {
                    translatedText
                  }
                </p>
              ) : (
                <p className="text-base leading-7 text-slate-400">
                  Tarjima natijasi
                  shu yerda
                  ko‘rinadi.
                </p>
              )}

              {loading && (
                <div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/80 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

                    <p className="mt-3 text-sm font-semibold text-slate-600">
                      AI tarjima
                      qilmoqda...
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={
                  copyTranslation
                }
                disabled={
                  !translatedText ||
                  loading
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copied
                  ? "✅ Nusxalandi"
                  : "📋 Nusxalash"}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={
              handleTranslate
            }
            disabled={
              loading ||
              !sourceText.trim()
            }
            className="mx-auto block min-h-12 w-full max-w-sm rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "🌍 Tarjima qilinmoqda..."
              : "🌍 Tarjima qilish"}
          </button>
        </div>
      </div>
    </section>
  );
}