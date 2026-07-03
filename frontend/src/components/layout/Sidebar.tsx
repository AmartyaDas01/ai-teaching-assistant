import {
  BarChart3,
  FileText,
  GraduationCap,
  ListChecks,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/documents", label: "Documents", Icon: FileText },
  { to: "/chat", label: "Chat", Icon: MessageSquare },
  { to: "/quiz", label: "Quiz Generator", Icon: ListChecks },
  { to: "/analytics", label: "Analytics", Icon: BarChart3 },
];

export default function Sidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col bg-slate-950 text-slate-300">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold text-white">AI Teaching</div>
          <div className="text-[11px] text-slate-500">Assistant</div>
        </div>
      </div>

      {/* Nav */}
      <div className="px-3">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
          Workspace
        </div>
        <nav className="space-y-1">
          {links.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-indigo-400" />
                  )}
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer card */}
      <div className="mt-auto p-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            Grounded RAG
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Answers cite your own course materials — no hallucinations.
          </p>
        </div>
        <div className="px-1 pt-3 text-[11px] text-slate-600">
          Phase 1 · Core RAG
        </div>
      </div>
    </aside>
  );
}
