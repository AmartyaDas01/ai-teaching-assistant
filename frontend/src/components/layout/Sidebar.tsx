import { NavLink } from "react-router-dom";

const links = [
  { to: "/documents", label: "Documents", icon: "📄" },
  { to: "/chat", label: "Chat", icon: "💬" },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col">
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="text-lg font-bold text-slate-800">AI TA</div>
        <div className="text-xs text-slate-400">Teaching Assistant</div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`
            }
          >
            <span>{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 text-[11px] text-slate-400 border-t border-slate-100">
        Phase 1 · Core RAG
      </div>
    </aside>
  );
}
