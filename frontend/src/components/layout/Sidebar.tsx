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
import { useCallback, useEffect, useRef, useState } from "react";
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

// Desktop sidebar resize bounds. The min keeps the longest nav label ("Quiz
// Generator") on one line; the max stops it from crowding out the content.
const MIN_WIDTH = 208;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 256; // matches the w-64 mobile drawer
const WIDTH_KEY = "ata_sidebar_width";

/** True at the md breakpoint and up, where the sidebar is static and resizable
 *  (below it, the sidebar is an overlay drawer and the drag handle is hidden). */
function useIsDesktop() {
  const query = "(min-width: 768px)";
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

export default function Sidebar() {
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const open = useAppStore((s) => s.sidebarOpen);
  const setOpen = useAppStore((s) => s.setSidebarOpen);
  const isDesktop = useIsDesktop();

  // Persisted desktop width. Applied inline only on desktop; on mobile the aside
  // falls back to the fixed-width w-64 drawer so a wide desktop choice can't spill
  // the drawer across a phone screen.
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem(WIDTH_KEY));
    return saved >= MIN_WIDTH && saved <= MAX_WIDTH ? saved : DEFAULT_WIDTH;
  });
  const dragging = useRef(false);

  useEffect(() => {
    localStorage.setItem(WIDTH_KEY, String(width));
  }, [width]);

  // Drag-to-resize. The aside's left edge is at x=0 on desktop, so the pointer's
  // clientX is the target width; clamp it to the bounds.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX)));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  // Keyboard resize for accessibility; arrows nudge, double-click resets.
  const nudge = useCallback((delta: number) => {
    setWidth((w) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w + delta)));
  }, []);

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
        style={isDesktop ? { width } : undefined}
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-white/10 bg-[#070708] text-slate-300 transition-transform duration-200 ease-out md:relative md:z-auto md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Resize handle - desktop only. Straddles the right border with an 8px hit
            area and a hairline that brightens on hover/drag. */}
        <div
          onMouseDown={startDrag}
          onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") nudge(-16);
            else if (e.key === "ArrowRight") nudge(16);
          }}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          aria-valuenow={width}
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={MAX_WIDTH}
          tabIndex={0}
          className="group absolute -right-1 top-0 z-10 hidden h-full w-2 cursor-col-resize md:block"
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/10 transition-colors group-hover:bg-white/40 group-focus-visible:bg-white/50" />
        </div>
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
