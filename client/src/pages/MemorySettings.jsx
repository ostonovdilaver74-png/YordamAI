import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getMemories,
  deleteMemory,
  clearMemories,
} from "../services/memoryService";

const CATEGORY_LABELS = {
  identity: "Shaxsiy ma’lumot",
  preference: "Afzallik",
  project: "Loyiha",
  goal: "Maqsad",
  personal: "Shaxsiy",
  instruction: "Ko‘rsatma",
  other: "Boshqa",
};

function formatDate(value) {
  if (!value) {
    return "";
  }

  try {
    return new Date(
      value
    ).toLocaleString();
  } catch {
    return "";
  }
}

export default function MemorySettings() {
  const [memories, setMemories] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [deletingId, setDeletingId] =
    useState(null);

  const [clearing, setClearing] =
    useState(false);

  const safeMemories = useMemo(
    () =>
      Array.isArray(memories)
        ? memories
        : [],
    [memories]
  );

  const loadMemories =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          const result =
            await getMemories();

          setMemories(
            Array.isArray(
              result?.memories
            )
              ? result.memories
              : []
          );
        } catch (loadError) {
          console.error(
            "MEMORY LOAD XATOSI:",
            loadError
          );

          setError(
            loadError?.message ||
              "Xotiralarni yuklab bo‘lmadi"
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const handleDelete =
    useCallback(
      async (memoryId) => {
        if (
          !memoryId ||
          deletingId
        ) {
          return;
        }

        try {
          setDeletingId(
            memoryId
          );

          setError("");

          await deleteMemory(
            memoryId
          );

          setMemories(
            (current) =>
              current.filter(
                (memory) =>
                  memory._id !==
                  memoryId
              )
          );
        } catch (deleteError) {
          console.error(
            "MEMORY DELETE XATOSI:",
            deleteError
          );

          setError(
            deleteError?.message ||
              "Xotirani o‘chirib bo‘lmadi"
          );
        } finally {
          setDeletingId(
            null
          );
        }
      },
      [deletingId]
    );

  const handleClear =
    useCallback(
      async () => {
        if (
          clearing ||
          safeMemories.length === 0
        ) {
          return;
        }

        const confirmed =
          window.confirm(
            "Barcha saqlangan xotiralarni o‘chirmoqchimisiz?"
          );

        if (!confirmed) {
          return;
        }

        try {
          setClearing(true);
          setError("");

          await clearMemories();

          setMemories([]);
        } catch (clearError) {
          console.error(
            "MEMORY CLEAR XATOSI:",
            clearError
          );

          setError(
            clearError?.message ||
              "Xotiralarni tozalab bo‘lmadi"
          );
        } finally {
          setClearing(false);
        }
      },
      [
        clearing,
        safeMemories.length,
      ]
    );

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Memory
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            YordamAI siz haqingizda saqlagan xotiralarni boshqaring.
          </p>
        </div>

        <button
          type="button"
          onClick={
            handleClear
          }
          disabled={
            clearing ||
            safeMemories.length === 0
          }
          className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {clearing
            ? "Tozalanmoqda..."
            : "Barcha xotiralarni tozalash"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

            <p className="mt-3 text-sm text-slate-500">
              Xotiralar yuklanmoqda...
            </p>
          </div>
        </div>
      ) : safeMemories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="text-4xl">
            🧠
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-800">
            Hozircha xotira yo‘q
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            YordamAI suhbat davomida foydali ma’lumotlarni saqlaganda ular shu yerda ko‘rinadi.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {safeMemories.map(
            (memory) => (
              <article
                key={
                  memory._id
                }
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {CATEGORY_LABELS[
                          memory.category
                        ] ||
                          memory.category ||
                          "Boshqa"}
                      </span>

                      <span className="text-xs text-slate-400">
                        Muhimlik:{" "}
                        {memory.importance ||
                          5}/10
                      </span>
                    </div>

                    <h3 className="mt-3 text-sm font-bold text-slate-900">
                      {memory.key}
                    </h3>

                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {memory.value}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      {memory.updatedAt && (
                        <span>
                          Yangilangan:{" "}
                          {formatDate(
                            memory.updatedAt
                          )}
                        </span>
                      )}

                      <span>
                        Ishlatilgan:{" "}
                        {Number(
                          memory.usageCount ||
                            0
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleDelete(
                        memory._id
                      )
                    }
                    disabled={
                      deletingId ===
                      memory._id
                    }
                    className="shrink-0 rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId ===
                    memory._id
                      ? "..."
                      : "O‘chirish"}
                  </button>
                </div>
              </article>
            )
          )}
        </div>
      )}
    </section>
  );
}