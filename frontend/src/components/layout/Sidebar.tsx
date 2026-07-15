import {
  BarChart3,
  FileText,
  GraduationCap,
  ListChecks,
  LogOut,
  MessageSquare,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";
import CourseSelector from "./CourseSelector";

const links = [
  { to: "/documents", label: "Documents", Icon: FileText },
  { to: "/chat", label: "Chat", Icon: MessageSquare },
  { to: "/quiz", label: "Quiz Generator", Icon: ListChecks },
  { to: "/analytics", label: "Analytics", Icon: BarChart3 },
  { to: "/settings", label: "Settings", Icon: SettingsIcon },
];

export default function Sidebar() {
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const open = useAppStore((s) => s.sidebarOpen);
  const setOpen = useAppStore((s) => s.setSidebarOpen);

  // Close the drawer on Escape (mobile). No-op on desktop, where it's always shown.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <>
      {/* Backdrop - mobile only, while the drawer is open */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-white/10 bg-[#070708] text-slate-300 transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black shadow-lg shadow-white/10 ring-1 ring-white/20">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-white">AI Teaching</div>
            <div className="text-[11px] text-slate-500">Assistant</div>
          </div>
          {/* Close - mobile only */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="ml-auto rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <CourseSelector />

        {/* Nav */}
        <div className="px-3 pt-2">
          <div className="label-mono px-3 pb-2 text-[10px] font-semibold text-slate-600">
            Workspace
          </div>
          <nav className="space-y-1">
            {links.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                // Tapping a link on mobile should navigate *and* dismiss the drawer.
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white" />
                    )}
                    <Icon className="h-[18px] w-[18px]" />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User + logout */}
        <div className="mt-auto border-t border-white/10 p-3">
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-white">
                {user?.name}
              </div>
              <div className="truncate text-[11px] text-slate-500">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              className="rounded-md p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
