function MenuIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

export default function Header({
  onMenuClick,
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#252b3a] bg-[#0b0f19] px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {/* MOBILE MENU */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Menyuni ochish"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#30384a] bg-[#111722] text-slate-300 transition hover:bg-[#171d2b] hover:text-white lg:hidden"
        >
          <MenuIcon />
        </button>

        <div className="min-w-0">
          <h2 className="truncate font-bold text-white">
            YordamAI
          </h2>

          <p className="truncate text-xs text-slate-500">
            Professional AI platforma
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label="Tungi rejim"
          className="grid h-10 w-10 place-items-center rounded-xl border border-[#30384a] bg-[#111722] text-slate-400 transition hover:border-violet-500/40 hover:bg-[#171d2b] hover:text-violet-300"
        >
          <MoonIcon />
        </button>

        <button
          type="button"
          className="flex h-10 items-center gap-2 rounded-xl border border-[#30384a] bg-[#111722] px-3 text-sm font-medium text-slate-200 transition hover:border-violet-500/40 hover:bg-[#171d2b] hover:text-white sm:px-4"
        >
          <UserIcon />

          <span className="hidden sm:inline">
            Dilaver
          </span>
        </button>
      </div>
    </header>
  );
}