export default function Header() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      <div>
        <h2 className="font-bold text-slate-900">YordamAI</h2>
        <p className="text-xs text-slate-500">Professional AI platforma</p>
      </div>

      <div className="flex items-center gap-3">
        <button className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200">
          🌙
        </button>

        <button className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800">
          👤 Dilaver
        </button>
      </div>
    </header>
  );
}