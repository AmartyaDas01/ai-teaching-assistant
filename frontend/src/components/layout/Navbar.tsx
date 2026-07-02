interface NavbarProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function Navbar({ title, subtitle, action }: NavbarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/70 px-6 backdrop-blur-md">
      <div>
        <h1 className="text-[17px] font-bold leading-tight tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
