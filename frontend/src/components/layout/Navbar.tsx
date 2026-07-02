interface NavbarProps {
  title: string;
  subtitle?: string;
}

export default function Navbar({ title, subtitle }: NavbarProps) {
  return (
    <header className="h-16 shrink-0 border-b border-slate-200 bg-white px-6 flex items-center">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </header>
  );
}
