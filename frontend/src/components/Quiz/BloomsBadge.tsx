import type { BloomLevel } from "../../types";

export const BLOOM_META: Record<
  BloomLevel,
  { name: string; className: string; dot: string }
> = {
  L1: { name: "Remember", className: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
  L2: { name: "Understand", className: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  L3: { name: "Apply", className: "bg-teal-50 text-teal-700 ring-teal-200", dot: "bg-teal-500" },
  L4: { name: "Analyze", className: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  L5: { name: "Evaluate", className: "bg-orange-50 text-orange-700 ring-orange-200", dot: "bg-orange-500" },
  L6: { name: "Create", className: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200", dot: "bg-fuchsia-500" },
};

interface BloomsBadgeProps {
  level: BloomLevel;
  showName?: boolean;
  className?: string;
}

export default function BloomsBadge({
  level,
  showName = true,
  className = "",
}: BloomsBadgeProps) {
  const meta = BLOOM_META[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.className} ${className}`}
      title={`Bloom's ${level} — ${meta.name}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {level}
      {showName && <span className="font-medium opacity-80">· {meta.name}</span>}
    </span>
  );
}
