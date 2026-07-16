import { useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useConversation } from "../context/ConversationContext";

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const {
    conversations = [],
    activeConversation,
    conversationLoading,
    newChat,
    openConversation,
    removeConversation,
  } = useConversation();

  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const filteredConversations = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    if (!cleanSearch) {
      return conversations;
    }

    return conversations.filter((conversation) =>
      (conversation.title || "Yangi chat")
        .toLowerCase()
        .includes(cleanSearch)
    );
  }, [conversations, search]);

  const linkClass = ({ isActive }) =>
    `px-4 py-3 rounded-xl transition ${
      isActive
        ? "bg-slate-900 text-white"
        : "text-slate-700 hover:bg-slate-100"
    }`;

  async function handleNewChat() {
    const conversation = await newChat();

    if (conversation) {
      setSearch("");
      navigate("/chat");
    }
  }

  async function handleOpenChat(conversationId) {
    await openConversation(conversationId);
    navigate("/chat");
  }

  async function handleDelete(event, conversationId) {
    event.stopPropagation();

    const confirmed = window.confirm(
      "Ushbu chatni o‘chirishni xohlaysizmi?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(conversationId);

      await removeConversation(conversationId);

      if (activeConversation?._id === conversationId) {
        navigate("/chat");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <aside className="w-80 h-screen bg-white border-r border-slate-200 flex flex-col p-4">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">
          🤖 YordamAI
        </h1>

        <p className="text-sm text-slate-500">
          O‘zbek AI yordamchi
        </p>
      </div>

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          🔍
        </span>

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Chatlarni qidirish..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />

        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            aria-label="Qidiruvni tozalash"
          >
            ✕
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={handleNewChat}
        disabled={conversationLoading}
        className="mt-4 bg-slate-900 text-white py-3 rounded-xl hover:bg-slate-800 transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        {conversationLoading
          ? "Yaratilmoqda..."
          : "➕ Yangi chat"}
      </button>

      <nav className="mt-5 flex flex-col gap-2">
        <NavLink to="/" className={linkClass}>
          🏠 Bosh sahifa
        </NavLink>

        <NavLink to="/chat" className={linkClass}>
          💬 AI Chat
        </NavLink>

        <NavLink to="/cv" className={linkClass}>
          📄 CV Generator
        </NavLink>

        <NavLink to="/translate" className={linkClass}>
          🌍 Tarjimon
        </NavLink>
      </nav>

      <div className="mt-6 flex-1 overflow-y-auto">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400">
            CHAT TARIXI
          </p>

          <span className="text-xs text-slate-400">
            {filteredConversations.length}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {conversations.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-400">
              Chatlar hali mavjud emas
            </p>
          )}

          {conversations.length > 0 &&
            filteredConversations.length === 0 && (
              <p className="px-4 py-3 text-sm text-slate-400">
                Mos chat topilmadi
              </p>
            )}

          {filteredConversations.map((conversation) => {
            const isActive =
              activeConversation?._id === conversation._id;

            const isDeleting =
              deletingId === conversation._id;

            return (
              <div
                key={conversation._id}
                className={`group flex items-center rounded-xl transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    handleOpenChat(conversation._id)
                  }
                  disabled={isDeleting}
                  className="min-w-0 flex-1 truncate px-4 py-3 text-left disabled:opacity-50"
                  title={conversation.title || "Yangi chat"}
                >
                  💬 {conversation.title || "Yangi chat"}
                </button>

                <button
                  type="button"
                  onClick={(event) =>
                    handleDelete(event, conversation._id)
                  }
                  disabled={isDeleting}
                  className="px-3 py-3 opacity-0 transition group-hover:opacity-100 disabled:opacity-50"
                  title="Chatni o‘chirish"
                  aria-label="Chatni o‘chirish"
                >
                  {isDeleting ? "..." : "🗑️"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="rounded-2xl bg-slate-100 p-4">
          <p className="font-semibold text-slate-900">
            👤 {user?.name || "Foydalanuvchi"}
          </p>

          <p className="text-sm capitalize text-slate-500">
            {user?.plan || "free"} plan
          </p>

          <button
            type="button"
            onClick={logout}
            className="mt-3 text-sm text-red-500 hover:underline"
          >
            Chiqish
          </button>
        </div>
      </div>
    </aside>
  );
}