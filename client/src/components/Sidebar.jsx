import {
  useMemo,
  useState,
} from "react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useConversation } from "../context/ConversationContext";
import "../styles/PremiumTheme.scss";

function IconBase({
  children,
  size = 18,
  className = "",
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

function HomeIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.8V21h13V9.8" />
      <path d="M9.5 21v-6h5v6" />
    </IconBase>
  );
}

function ChatIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </IconBase>
  );
}

function GemIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M6 3h12l3 5-9 13L3 8z" />
      <path d="m3 8 9 4 9-4" />
      <path d="m8 3 4 9 4-9" />
    </IconBase>
  );
}

function FileTextIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M6 2h8l4 4v16H6z" />
      <path d="M14 2v5h5" />
      <path d="M9 12h6M9 16h6" />
    </IconBase>
  );
}

function LanguagesIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 5h8" />
      <path d="M8 3v2c0 4-2 7-5 9" />
      <path d="M5 10c1 2 3 4 6 5" />
      <path d="m14 20 4-10 4 10" />
      <path d="M15.5 17h5" />
    </IconBase>
  );
}

function BrainIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M9.5 4.5A3 3 0 0 0 4 6v1.2A3.2 3.2 0 0 0 3 13a3 3 0 0 0 3 4h1a3 3 0 0 0 5 2.2V5.8A3 3 0 0 0 9.5 4.5Z" />
      <path d="M14.5 4.5A3 3 0 0 1 20 6v1.2a3.2 3.2 0 0 1 1 5.8 3 3 0 0 1-3 4h-1a3 3 0 0 1-5 2.2V5.8a3 3 0 0 1 2.5-1.3Z" />
      <path d="M7 9h2M15 9h2M7 14h2M15 14h2" />
    </IconBase>
  );
}

function DatabaseIcon(props) {
  return (
    <IconBase {...props}>
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
      <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </IconBase>
  );
}

function SearchIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </IconBase>
  );
}

function PlusIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}

function TrashIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="m7 7 1 14h8l1-14" />
      <path d="M10 11v6M14 11v6" />
    </IconBase>
  );
}

function UserIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </IconBase>
  );
}

function LogOutIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M14 3h7v18h-7" />
    </IconBase>
  );
}

function BotMarkIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="5" y="7" width="14" height="11" rx="3" />
      <path d="M12 3v4" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="M9 15h6" />
    </IconBase>
  );
}

export default function Sidebar({ mobileOpen = false, onMobileClose }) {
  const navigate = useNavigate();

  const {
    user,
    logout,
  } = useAuth();

  const {
    conversations = [],
    activeConversation,
    conversationLoading,
    newChat,
    openConversation,
    removeConversation,
  } = useConversation();

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    deletingId,
    setDeletingId,
  ] = useState(null);

  /* =========================================================
     CHAT QIDIRISH
  ========================================================= */

  const filteredConversations =
    useMemo(() => {
      const cleanSearch = search
        .trim()
        .toLowerCase();

      if (!cleanSearch) {
        return conversations;
      }

      return conversations.filter(
        (conversation) =>
          (
            conversation.title ||
            "Yangi chat"
          )
            .toLowerCase()
            .includes(cleanSearch)
      );
    }, [
      conversations,
      search,
    ]);

  /* =========================================================
     MENU LINK STYLE
  ========================================================= */

  const linkClass = ({
    isActive,
  }) =>
    `px-4 py-3 rounded-xl border transition ${
      isActive
        ? "border-violet-500/30 bg-violet-500/15 text-white shadow-[0_0_24px_rgba(124,58,237,0.12)]"
        : "border-transparent text-slate-300 hover:border-[#30384a] hover:bg-[#151b28] hover:text-white"
    }`;

  function closeMobileSidebar() {
    if (typeof onMobileClose === "function") {
      onMobileClose();
    }
  }

  /* =========================================================
     YANGI CHAT
  ========================================================= */

  async function handleNewChat() {
    const conversation =
      await newChat();

    if (conversation) {
      setSearch("");

      navigate("/chat");
      closeMobileSidebar();
    }
  }

  /* =========================================================
     CHATNI OCHISH
  ========================================================= */

  async function handleOpenChat(
    conversationId
  ) {
    await openConversation(
      conversationId
    );

    navigate("/chat");
    closeMobileSidebar();
  }

  /* =========================================================
     CHATNI O‘CHIRISH
  ========================================================= */

  async function handleDelete(
    event,
    conversationId
  ) {
    event.stopPropagation();

    const confirmed =
      window.confirm(
        "Ushbu chatni o‘chirishni xohlaysizmi?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        conversationId
      );

      await removeConversation(
        conversationId
      );

      if (
        activeConversation?._id ===
        conversationId
      ) {
        navigate("/chat");
      }
    } finally {
      setDeletingId(null);
    }
  }

  /* =========================================================
     SIDEBAR
  ========================================================= */

  return (
    <>
      <button
        type="button"
        aria-label="Mobil menyuni yopish"
        onClick={closeMobileSidebar}
        className={[
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] transition-opacity lg:hidden",
          mobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      <aside
        className={[
          "yordamai-premium-sidebar fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[86vw] max-w-80 flex-col border-r border-[#252b3a] bg-[#0b0f19] p-4 text-slate-200 shadow-2xl transition-transform duration-300 ease-out",
          "lg:static lg:z-auto lg:h-screen lg:w-80 lg:max-w-none lg:translate-x-0 lg:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >

      {/* LOGO */}

      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/20 to-fuchsia-500/10 text-violet-300 shadow-[0_0_26px_rgba(124,58,237,0.14)]">
          <BotMarkIcon size={22} />
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-white">
            YordamAI
          </h1>

          <p className="text-sm text-slate-500">
            O‘zbek AI yordamchi
          </p>
        </div>

        <button
          type="button"
          onClick={closeMobileSidebar}
          className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#30384a] bg-[#111722] text-slate-300 transition hover:bg-[#151b28] hover:text-white lg:hidden"
          aria-label="Menyuni yopish"
        >
          ✕
        </button>
      </div>

      {/* CHAT QIDIRISH */}

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
          <SearchIcon size={17} />
        </span>

        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Chatlarni qidirish..."
          className="w-full rounded-xl border border-[#30384a] bg-[#111722] py-3 pl-11 pr-10 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:bg-[#151b28] focus:ring-2 focus:ring-violet-500/20"
        />

        {search && (
          <button
            type="button"
            onClick={() =>
              setSearch("")
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
            aria-label="Qidiruvni tozalash"
          >
            ✕
          </button>
        )}
      </div>

      {/* YANGI CHAT */}

      <button
        type="button"
        onClick={
          handleNewChat
        }
        disabled={
          conversationLoading
        }
        className="mt-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 font-semibold text-white shadow-[0_10px_26px_rgba(124,58,237,0.22)] transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {conversationLoading ? (
          "Yaratilmoqda..."
        ) : (
          <span className="inline-flex items-center justify-center gap-2">
            <PlusIcon size={17} />
            Yangi chat
          </span>
        )}
      </button>

      {/* ASOSIY MENU */}

      <nav className="mt-5 flex flex-col gap-2">

        <NavLink
          to="/"
          onClick={closeMobileSidebar}
          className={
            linkClass
          }
        >
          <span className="inline-flex items-center gap-3"><HomeIcon size={18} />Bosh sahifa</span>
        </NavLink>

        <NavLink
          to="/chat"
          onClick={closeMobileSidebar}
          className={
            linkClass
          }
        >
          <span className="inline-flex items-center gap-3"><ChatIcon size={18} />AI Chat</span>
        </NavLink>

        <NavLink
          to="/pricing"
          onClick={closeMobileSidebar}
          className={
            linkClass
          }
        >
          <span className="inline-flex items-center gap-3"><GemIcon size={18} />Tariflar</span>
        </NavLink>

        <NavLink
          to="/cv"
          onClick={closeMobileSidebar}
          className={
            linkClass
          }
        >
          <span className="inline-flex items-center gap-3"><FileTextIcon size={18} />CV Generator</span>
        </NavLink>

        <NavLink
          to="/translate"
          onClick={closeMobileSidebar}
          className={
            linkClass
          }
        >
          <span className="inline-flex items-center gap-3"><LanguagesIcon size={18} />Tarjimon</span>
        </NavLink>

        {/* MEMORY */}

        <NavLink
          to="/memory"
          onClick={closeMobileSidebar}
          className={linkClass}
    >
          <span className="inline-flex items-center gap-3"><BrainIcon size={18} />Memory</span>
        </NavLink>

        <NavLink
          to="/knowledge"
          onClick={closeMobileSidebar}
          className={linkClass}
        >
          <span className="inline-flex items-center gap-3"><DatabaseIcon size={18} />Knowledge Base</span>
        </NavLink>

      </nav>

      {/* CHAT TARIXI */}

      <div className="mt-6 flex-1 overflow-y-auto">

        <div className="mb-2 flex items-center justify-between">

          <p className="text-xs font-semibold tracking-[0.08em] text-slate-500">
            CHAT TARIXI
          </p>

          <span className="text-xs text-slate-600">
            {
              filteredConversations.length
            }
          </span>

        </div>

        <div className="flex flex-col gap-2">

          {conversations.length ===
            0 && (
            <p className="px-4 py-3 text-sm text-slate-600">
              Chatlar hali mavjud emas
            </p>
          )}

          {conversations.length >
            0 &&
            filteredConversations.length ===
              0 && (
              <p className="px-4 py-3 text-sm text-slate-600">
                Mos chat topilmadi
              </p>
            )}

          {filteredConversations.map(
            (
              conversation
            ) => {
              const isActive =
                activeConversation?._id ===
                conversation._id;

              const isDeleting =
                deletingId ===
                conversation._id;

              return (
                <div
                  key={
                    conversation._id
                  }
                  className={`group flex items-center rounded-xl border transition ${
                    isActive
                      ? "border-violet-500/30 bg-violet-500/15 text-white"
                      : "border-transparent text-slate-400 hover:border-[#30384a] hover:bg-[#151b28] hover:text-slate-200"
                  }`}
                >

                  <button
                    type="button"
                    onClick={() =>
                      handleOpenChat(
                        conversation._id
                      )
                    }
                    disabled={
                      isDeleting
                    }
                    className="min-w-0 flex-1 truncate px-4 py-3 text-left disabled:opacity-50"
                    title={
                      conversation.title ||
                      "Yangi chat"
                    }
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <ChatIcon size={15} className="shrink-0 opacity-75" />
                      <span className="truncate">
                        {conversation.title || "Yangi chat"}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={(
                      event
                    ) =>
                      handleDelete(
                        event,
                        conversation._id
                      )
                    }
                    disabled={
                      isDeleting
                    }
                    className="px-3 py-3 opacity-0 transition group-hover:opacity-100 disabled:opacity-50"
                    title="Chatni o‘chirish"
                    aria-label="Chatni o‘chirish"
                  >
                    {isDeleting ? (
                      "..."
                    ) : (
                      <TrashIcon size={16} />
                    )}
                  </button>

                </div>
              );
            }
          )}

        </div>
      </div>

      {/* USER */}

      <div className="border-t border-[#252b3a] pt-4">

        <div className="rounded-2xl border border-[#252b3a] bg-[#111722] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">

          <p className="font-semibold text-white">
            <span className="inline-flex items-center gap-2">
              <UserIcon size={17} className="text-violet-300" />
              {user?.name || "Foydalanuvchi"}
            </span>
          </p>

          <p className="text-sm capitalize text-slate-500">
            {user?.plan ||
              "free"}{" "}
            plan
          </p>

          {String(
            user?.plan ||
              "free"
          ).toLowerCase() !==
            "pro" && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/pricing"
                )
              }
              className="mt-3 block text-sm font-semibold text-violet-400 transition hover:text-violet-300"
            >
              <span className="inline-flex items-center gap-2"><GemIcon size={15} />Pro ga o‘tish</span>
            </button>
          )}

          <button
            type="button"
            onClick={
              logout
            }
            className="mt-3 block text-sm text-red-400 transition hover:text-red-300"
          >
            <span className="inline-flex items-center gap-2"><LogOutIcon size={15} />Chiqish</span>
          </button>

        </div>
      </div>

      </aside>
    </>
  );
}