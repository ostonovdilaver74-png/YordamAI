import { useEffect, useRef, useState } from "react";

import { askAI } from "../services/ai";
import { useConversation } from "../context/ConversationContext";

import ChatInput from "../components/chat/ChatInput";
import MessageList from "../components/chat/MessageList";
import TypingIndicator from "../components/chat/TypingIndicator";
import EmptyState from "../components/chat/EmptyState";

const AI_MODELS = [
  {
    key: "GEMINI",
    name: "Gemini",
    icon: "🟢",
  },
  {
    key: "GPT",
    name: "GPT",
    icon: "🔵",
  },
  {
    key: "CLAUDE",
    name: "Claude",
    icon: "🟣",
  },
  {
    key: "DEEPSEEK",
    name: "DeepSeek",
    icon: "🟠",
  },
];

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

  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem("yordamai_model") || "GEMINI";
  });

  const bottomRef = useRef(null);

  const safeMessages = Array.isArray(messages)
    ? messages
    : [];

  const selectedModelInfo =
    AI_MODELS.find(
      (model) => model.key === selectedModel
    ) || AI_MODELS[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [safeMessages, sending]);

  function handleModelChange(event) {
    const modelKey = event.target.value;

    setSelectedModel(modelKey);

    localStorage.setItem(
      "yordamai_model",
      modelKey
    );
  }

  async function sendMessage(text) {
    const cleanText = text.trim();

    if (!cleanText || sending) {
      return;
    }

    const temporaryMessage = {
      _id: `temporary-${Date.now()}`,
      role: "user",
      content: cleanText,
    };

    setConversationError("");
    setSending(true);

    setMessages((previous) => [
      ...previous,
      temporaryMessage,
    ]);

    try {
      const result = await askAI(
        cleanText,
        activeConversation?._id || null,
        selectedModel
      );

      if (!result.success) {
        throw new Error(
          result.message ||
            result.error ||
            "Xabar yuborilmadi"
        );
      }

      activateConversation(result.conversation);

      const assistantMessage = {
        ...result.assistantMessage,
        modelKey:
          result.ai?.modelKey || selectedModel,
        model:
          result.ai?.model || selectedModel,
      };

      setMessages((previous) => {
        const messagesWithoutTemporary =
          previous.filter(
            (message) =>
              message._id !== temporaryMessage._id
          );

        return [
          ...messagesWithoutTemporary,
          result.userMessage,
          assistantMessage,
        ];
      });

      await loadConversations();
    } catch (error) {
      console.error(
        "XABAR YUBORISH XATOSI:",
        error
      );

      setMessages((previous) =>
        previous.filter(
          (message) =>
            message._id !== temporaryMessage._id
        )
      );

      setConversationError(
        error.message ||
          "Xabar yuborishda xatolik"
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="h-[calc(100vh-120px)] bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            💬{" "}
            {activeConversation?.title ||
              "AI Chat"}
          </h1>

          <p className="text-sm text-slate-500">
            YordamAI bilan suhbatlashing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="ai-model"
            className="text-sm font-medium text-slate-600"
          >
            Model:
          </label>

          <select
            id="ai-model"
            value={selectedModel}
            onChange={handleModelChange}
            disabled={sending}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
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
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversationError && (
          <div className="mx-6 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {conversationError}
          </div>
        )}

        {conversationLoading &&
        safeMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-500">
            Chat yuklanmoqda...
          </div>
        ) : safeMessages.length === 0 ? (
          <EmptyState />
        ) : (
          <MessageList messages={safeMessages} />
        )}

        {sending && (
          <div className="mx-auto w-full max-w-[900px] px-6">
            <TypingIndicator />

            <p className="mt-1 text-xs text-slate-400">
              {selectedModelInfo.icon}{" "}
              {selectedModelInfo.name} javob
              tayyorlamoqda...
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <ChatInput
        onSend={sendMessage}
        isLoading={sending}
      />
    </div>
  );
}