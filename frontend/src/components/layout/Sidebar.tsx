import { FileText, GraduationCap, MessageSquare } from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/documents", label: "Documents", Icon: FileText },
  { to: "/chat", label: "Chat", Icon: MessageSquare },
];

export default function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-3 border-b border-border px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-fg">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-bold leading-tight text-foreground">
            AI Teaching
          </div>
          <div className="text-xs text-muted">Assistant</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? "bg-primary-soft text-primary"
                  : "text-muted hover:bg-slate-50 hover:text-foreground"
              }`
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-4 text-[11px] text-muted">
        Phase 1 · Core RAG
      </div>
    </aside>
  );
}
