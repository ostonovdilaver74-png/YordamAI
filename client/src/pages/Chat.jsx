import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  askAIStream,
  createAIAbortController,
} from "../services/ai";

import { uploadPdf } from "../services/pdfService";
import { useConversation } from "../context/ConversationContext";

import ChatInput from "../components/chat/ChatInput";
import MessageList from "../components/chat/MessageList";
import TypingIndicator from "../components/chat/TypingIndicator";
import EmptyState from "../components/chat/EmptyState";

const DEFAULT_MODEL = "GEMINI";
const MODEL_STORAGE_KEY = "yordamai_model";

const AI_MODELS = Object.freeze([
  {
    key: "GEMINI",
    name: "Gemini",
    icon: "🟢",
    description: "Tez va universal",
  },
  {
    key: "GPT",
    name: "GPT",
    icon: "🔵",
    description: "Kuchli tahlil va kod",
  },
  {
    key: "CLAUDE",
    name: "Claude",
    icon: "🟣",
    description: "Matn va tahlil",
  },
  {
    key: "DEEPSEEK",
    name: "DeepSeek",
    icon: "🟠",
    description: "Mantiq va dasturlash",
  },
]);

function createTemporaryId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function createTemporaryUserMessage(content) {
  return {
    _id: createTemporaryId("temporary-user"),
    role: "user",
    content,
    isTemporary: true,
    createdAt: new Date().toISOString(),
  };
}

function createStreamingAssistantMessage(modelKey) {
  return {
    _id: createTemporaryId("streaming-assistant"),
    role: "assistant",
    content: "",
    modelKey,
    model: modelKey,
    isTemporary: true,
    isStreaming: true,
    createdAt: new Date().toISOString(),
  };
}

function getStoredModel() {
  try {
    const savedModel = localStorage.getItem(
      MODEL_STORAGE_KEY
    );

    const modelExists = AI_MODELS.some(
      (model) => model.key === savedModel
    );

    return modelExists
      ? savedModel
      : DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

function normalizePdfResult(result, originalFile) {
  return {
    text: result?.document?.text || "",
    originalLength:
      Number(result?.document?.originalLength) || 0,
    truncated: Boolean(result?.document?.truncated),
    pages: Number(result?.file?.pages) || null,
    name:
      result?.file?.name ||
      originalFile?.name ||
      "document.pdf",
    size:
      Number(result?.file?.size) ||
      Number(originalFile?.size) ||
      0,
  };
}

export default function Chat() {
  const {
    activeConversation,
    messages,
    conversationLoading,
    conversationError,
    setMessages,
    setConversationError,
    activateConversation,
    loadConversations,
  } = useConversation();

  const [sending, setSending] = useState(false);

  const [selectedModel, setSelectedModel] =
    useState(getStoredModel);

  const [selectedPdf, setSelectedPdf] =
    useState(null);

  const [pdfDocument, setPdfDocument] =
    useState(null);

  const [isPdfLoading, setIsPdfLoading] =
    useState(false);

  const [lastFailedMessage, setLastFailedMessage] =
    useState("");

  const [streamingContent, setStreamingContent] =
    useState("");

  const [requestCancelled, setRequestCancelled] =
    useState(false);

  const bottomRef = useRef(null);
  const abortControllerRef = useRef(null);
  const activeRequestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const safeMessages = useMemo(
    () => (Array.isArray(messages) ? messages : []),
    [messages]
  );

  const selectedModelInfo = useMemo(() => {
    return (
      AI_MODELS.find(
        (model) => model.key === selectedModel
      ) || AI_MODELS[0]
    );
  }, [selectedModel]);

  const hasPdf = Boolean(
    selectedPdf && pdfDocument?.text
  );

  const isBusy = sending || isPdfLoading;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: sending ? "smooth" : "auto",
      block: "end",
    });
  }, [
    safeMessages,
    sending,
    streamingContent,
    conversationError,
  ]);

  useEffect(() => {
  setLastFailedMessage("");
  setRequestCancelled(false);

  /*
    Yangi chat streaming vaqtida yaratilganda
    activeConversation ID o‘zgaradi.

    Bu yerda AbortController bekor qilinmaydi,
    aks holda AI oqimi darhol to‘xtab qoladi.
  */
  if (!sending) {
    setStreamingContent("");
  }
}, [activeConversation?._id, sending]);

  const clearConversationError = useCallback(() => {
    if (conversationError) {
      setConversationError("");
    }
  }, [
    conversationError,
    setConversationError,
  ]);

  const handleModelChange = useCallback(
    (event) => {
      if (sending) {
        return;
      }

      const modelKey = event.target.value;

      const modelExists = AI_MODELS.some(
        (model) => model.key === modelKey
      );

      if (!modelExists) {
        return;
      }

      setSelectedModel(modelKey);
      clearConversationError();

      try {
        localStorage.setItem(
          MODEL_STORAGE_KEY,
          modelKey
        );
      } catch (error) {
        console.warn(
          "Model tanlovini saqlashda xatolik:",
          error
        );
      }
    },
    [
      clearConversationError,
      sending,
    ]
  );

  const handlePdfSelect = useCallback(
    async (file) => {
      if (!file || isBusy) {
        return;
      }

      const isPdf =
        file.type === "application/pdf" ||
        file.name
          ?.toLowerCase()
          .endsWith(".pdf");

      if (!isPdf) {
        setConversationError(
          "Faqat PDF formatdagi faylni tanlang."
        );
        return;
      }

      try {
        clearConversationError();

        setSelectedPdf(file);
        setPdfDocument(null);
        setIsPdfLoading(true);

        const result = await uploadPdf(file);

        if (!result?.success) {
          throw new Error(
            result?.message ||
              result?.error ||
              "PDF fayl o‘qilmadi"
          );
        }

        const normalizedDocument =
          normalizePdfResult(result, file);

        if (!normalizedDocument.text.trim()) {
          throw new Error(
            "PDF ichidan o‘qiladigan matn topilmadi"
          );
        }

        if (!mountedRef.current) {
          return;
        }

        setPdfDocument(normalizedDocument);
      } catch (error) {
        console.error(
          "PDF YUKLASH XATOSI:",
          error
        );

        if (!mountedRef.current) {
          return;
        }

        setSelectedPdf(null);
        setPdfDocument(null);

        setConversationError(
          error?.message ||
            "PDF faylni yuklashda xatolik"
        );
      } finally {
        if (mountedRef.current) {
          setIsPdfLoading(false);
        }
      }
    },
    [
      clearConversationError,
      isBusy,
      setConversationError,
    ]
  );

  const handleRemovePdf = useCallback(() => {
    if (isBusy) {
      return;
    }

    setSelectedPdf(null);
    setPdfDocument(null);
    clearConversationError();
  }, [
    clearConversationError,
    isBusy,
  ]);

  const stopGenerating = useCallback(() => {
    if (!sending) {
      return;
    }

    setRequestCancelled(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [sending]);

  const removeTemporaryMessages = useCallback(
    (userTemporaryId, assistantTemporaryId) => {
      setMessages((previousMessages) => {
        const currentMessages = Array.isArray(
          previousMessages
        )
          ? previousMessages
          : [];

        return currentMessages.filter(
          (message) =>
            message?._id !== userTemporaryId &&
            message?._id !== assistantTemporaryId
        );
      });
    },
    [setMessages]
  );

  const sendMessage = useCallback(
    async (text) => {
      const cleanText = String(text || "").trim();

      if (
        !cleanText ||
        sending ||
        isPdfLoading
      ) {
        return;
      }

      if (
        selectedPdf &&
        !pdfDocument?.text
      ) {
        setConversationError(
          "PDF hali tayyor emas. Biroz kuting."
        );
        return;
      }

      const requestId =
        activeRequestIdRef.current + 1;

      activeRequestIdRef.current = requestId;

      const abortController =
        createAIAbortController();

      abortControllerRef.current =
        abortController;

      const temporaryUserMessage =
        createTemporaryUserMessage(cleanText);

      const temporaryAssistantMessage =
        createStreamingAssistantMessage(
          selectedModel
        );

      clearConversationError();
      setLastFailedMessage("");
      setRequestCancelled(false);
      setStreamingContent("");
      setSending(true);

      setMessages((previousMessages) => {
        const currentMessages = Array.isArray(
          previousMessages
        )
          ? previousMessages
          : [];

        return [
          ...currentMessages,
          temporaryUserMessage,
          temporaryAssistantMessage,
        ];
      });

      try {
        const result = await askAIStream(
          cleanText,
          activeConversation?._id || null,
          selectedModel,
          pdfDocument?.text || "",
          {
            signal: abortController.signal,

           onStart() {
  if (
    !mountedRef.current ||
    requestId !== activeRequestIdRef.current
  ) {
    return;
  }
},
            onModel(modelData) {
              if (
                !mountedRef.current ||
                requestId !==
                  activeRequestIdRef.current
              ) {
                return;
              }

              setMessages((previousMessages) => {
                const currentMessages =
                  Array.isArray(previousMessages)
                    ? previousMessages
                    : [];

                return currentMessages.map(
                  (message) => {
                    if (
                      message?._id !==
                      temporaryAssistantMessage._id
                    ) {
                      return message;
                    }

                    return {
                      ...message,
                      modelKey:
                        modelData?.modelKey ||
                        selectedModel,
                      model:
                        modelData?.model ||
                        selectedModel,
                    };
                  }
                );
              });
            },

            onToken(token, streamState) {
              if (
                !mountedRef.current ||
                requestId !==
                  activeRequestIdRef.current
              ) {
                return;
              }

              const fullReply =
                streamState?.fullReply || "";

              setStreamingContent(fullReply);

              setMessages((previousMessages) => {
                const currentMessages =
                  Array.isArray(previousMessages)
                    ? previousMessages
                    : [];

                return currentMessages.map(
                  (message) => {
                    if (
                      message?._id !==
                      temporaryAssistantMessage._id
                    ) {
                      return message;
                    }

                    return {
                      ...message,
                      content: fullReply,
                      isTemporary: true,
                      isStreaming: true,
                    };
                  }
                );
              });
            },
          }
        );

        if (
          !mountedRef.current ||
          requestId !==
            activeRequestIdRef.current
        ) {
          return;
        }

        if (!result?.success) {
          throw new Error(
            result?.message ||
              result?.error ||
              "AI javobi olinmadi"
          );
        }

        if (result.conversation) {
          activateConversation(
            result.conversation
          );
        }

        const finalAssistantMessage = {
          ...result.assistantMessage,
          modelKey:
            result?.ai?.modelKey ||
            selectedModel,
          model:
            result?.ai?.model ||
            selectedModel,
          isTemporary: false,
          isStreaming: false,
        };

        setMessages((previousMessages) => {
          const currentMessages = Array.isArray(
            previousMessages
          )
            ? previousMessages
            : [];

          const withoutTemporary =
            currentMessages.filter(
              (message) =>
                message?._id !==
                  temporaryUserMessage._id &&
                message?._id !==
                  temporaryAssistantMessage._id
            );

          return [
            ...withoutTemporary,
            result.userMessage,
            finalAssistantMessage,
          ];
        });

        setStreamingContent("");

        try {
          await loadConversations();
        } catch (loadError) {
          console.error(
            "CHAT TARIXINI YANGILASH XATOSI:",
            loadError
          );
        }
      } catch (error) {
        console.error(
          "STREAMING XABAR XATOSI:",
          error
        );

        if (
          !mountedRef.current ||
          requestId !==
            activeRequestIdRef.current
        ) {
          return;
        }

        const wasAborted =
          error?.code === "AI_REQUEST_ABORTED" ||
          error?.name === "AbortError" ||
          abortController.signal.aborted;

        const partialReply =
          error?.data?.partialReply ||
          streamingContent;

        if (wasAborted && partialReply) {
          setMessages((previousMessages) => {
            const currentMessages =
              Array.isArray(previousMessages)
                ? previousMessages
                : [];

            return currentMessages.map(
              (message) => {
                if (
                  message?._id !==
                  temporaryAssistantMessage._id
                ) {
                  return message;
                }

                return {
                  ...message,
                  content: partialReply,
                  isTemporary: false,
                  isStreaming: false,
                  wasStopped: true,
                };
              }
            );
          });

          setConversationError(
            "Javob yaratish to‘xtatildi."
          );
        } else {
          removeTemporaryMessages(
            temporaryUserMessage._id,
            temporaryAssistantMessage._id
          );

          setLastFailedMessage(cleanText);

          setConversationError(
            error?.message ||
              "Xabar yuborishda xatolik"
          );
        }
      } finally {
        if (
          mountedRef.current &&
          requestId ===
            activeRequestIdRef.current
        ) {
          setSending(false);
          setStreamingContent("");
        }

        if (
          abortControllerRef.current ===
          abortController
        ) {
          abortControllerRef.current = null;
        }
      }
    },
    [
      activeConversation?._id,
      activateConversation,
      clearConversationError,
      isPdfLoading,
      loadConversations,
      pdfDocument?.text,
      removeTemporaryMessages,
      selectedModel,
      selectedPdf,
      sending,
      setConversationError,
      setMessages,
      streamingContent,
    ]
  );

  const retryLastMessage = useCallback(() => {
    if (
      !lastFailedMessage ||
      sending ||
      isPdfLoading
    ) {
      return;
    }

    sendMessage(lastFailedMessage);
  }, [
    isPdfLoading,
    lastFailedMessage,
    sendMessage,
    sending,
  ]);

  return (
    <section className="flex h-[calc(100dvh-120px)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl">
      <header className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/90 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="text-xl"
            >
              💬
            </span>

            <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">
              {activeConversation?.title ||
                "AI Chat"}
            </h1>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            {hasPdf
              ? `${pdfDocument.name} hujjati bilan suhbat`
              : "YordamAI bilan suhbatlashing"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="ai-model"
            className="shrink-0 text-sm font-medium text-slate-600"
          >
            Model
          </label>

          <select
            id="ai-model"
            value={selectedModel}
            onChange={handleModelChange}
            disabled={sending}
            aria-label="AI modelini tanlash"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[160px]"
          >
            {AI_MODELS.map((model) => (
              <option
                key={model.key}
                value={model.key}
              >
                {model.icon} {model.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {(selectedPdf || isPdfLoading) && (
        <div className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
          <div
            className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
              isPdfLoading
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-blue-200 bg-blue-50 text-blue-800"
            }`}
          >
            <div className="min-w-0">
              <p className="truncate font-semibold">
                📄{" "}
                {pdfDocument?.name ||
                  selectedPdf?.name ||
                  "PDF fayl"}
              </p>

              <p className="mt-1 text-xs leading-5 opacity-80">
                {isPdfLoading
                  ? "PDF matni o‘qilmoqda..."
                  : "PDF muvaffaqiyatli tayyorlandi."}

                {!isPdfLoading &&
                pdfDocument?.pages
                  ? ` Sahifalar: ${pdfDocument.pages}.`
                  : ""}

                {!isPdfLoading &&
                pdfDocument?.truncated
                  ? " Fayl uzun bo‘lgani uchun matnning bir qismi ishlatiladi."
                  : ""}
              </p>
            </div>

            {!isPdfLoading && !sending && (
              <button
                type="button"
                onClick={handleRemovePdf}
                className="shrink-0 rounded-lg px-2 py-1 font-semibold transition hover:bg-white/70"
                aria-label="PDF faylni olib tashlash"
                title="PDF faylni olib tashlash"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      <div className="relative flex-1 overflow-y-auto overscroll-contain">
        {conversationError && (
          <div className="mx-auto mt-4 w-[calc(100%-2rem)] max-w-[900px] sm:w-[calc(100%-3rem)]">
            <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div>
                <p className="font-medium">
                  {conversationError}
                </p>

                {lastFailedMessage && !sending && (
                  <button
                    type="button"
                    onClick={retryLastMessage}
                    className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    Qayta yuborish
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={clearConversationError}
                className="shrink-0 rounded-md px-1.5 py-0.5 text-lg leading-none transition hover:bg-red-100"
                aria-label="Xatolik xabarini yopish"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {conversationLoading &&
        safeMessages.length === 0 ? (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

            <p className="text-sm font-medium">
              Chat yuklanmoqda...
            </p>
          </div>
        ) : safeMessages.length === 0 ? (
          <EmptyState />
        ) : (
          <MessageList messages={safeMessages} />
        )}

        {sending && !streamingContent && (
          <div className="mx-auto w-full max-w-[900px] px-4 pb-4 sm:px-6">
            <TypingIndicator />

            <p className="mt-2 text-xs text-slate-400">
              {selectedModelInfo.icon}{" "}
              {selectedModelInfo.name} javob
              tayyorlamoqda...
            </p>
          </div>
        )}

        {sending && (
          <div className="mx-auto flex w-full max-w-[900px] justify-end px-4 pb-4 sm:px-6">
            <button
              type="button"
              onClick={stopGenerating}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            >
              ■ Javobni to‘xtatish
            </button>
          </div>
        )}

        {requestCancelled && !sending && (
          <div className="mx-auto w-full max-w-[900px] px-4 pb-4 sm:px-6">
            <p className="text-xs text-slate-400">
              Javob yaratish foydalanuvchi tomonidan
              to‘xtatildi.
            </p>
          </div>
        )}

        <div
          ref={bottomRef}
          className="h-1"
          aria-hidden="true"
        />
      </div>

      <div className="border-t border-slate-100 bg-white">
        <ChatInput
          onSend={sendMessage}
          onPdfSelect={handlePdfSelect}
          selectedPdf={selectedPdf}
          onRemovePdf={handleRemovePdf}
          isLoading={sending}
          isPdfLoading={isPdfLoading}
        />

        <div className="px-4 pb-2 text-center text-[11px] text-slate-400 sm:px-6">
          YordamAI xato qilishi mumkin. Muhim
          ma’lumotlarni tekshiring.
        </div>
      </div>
    </section>
  );
}