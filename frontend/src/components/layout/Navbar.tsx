import { Menu } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";

interface NavbarProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function Navbar({ title, subtitle, action }: NavbarProps) {
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0a0a0c]/70 px-4 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        {/* Opens the off-canvas sidebar - mobile only (it's always visible from md up) */}
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          className="-ml-1 shrink-0 rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
