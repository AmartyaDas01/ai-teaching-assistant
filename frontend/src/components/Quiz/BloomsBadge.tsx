import type { BloomLevel } from "../../types";

export const BLOOM_META: Record<
  BloomLevel,
  { name: string; className: string; dot: string }
> = {
  L1: { name: "Remember", className: "bg-sky-500/15 text-sky-300 ring-sky-500/30", dot: "bg-sky-400" },
  L2: { name: "Understand", className: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30", dot: "bg-emerald-400" },
  L3: { name: "Apply", className: "bg-teal-500/15 text-teal-300 ring-teal-500/30", dot: "bg-teal-400" },
  L4: { name: "Analyze", className: "bg-amber-500/15 text-amber-300 ring-amber-500/30", dot: "bg-amber-400" },
  L5: { name: "Evaluate", className: "bg-orange-500/15 text-orange-300 ring-orange-500/30", dot: "bg-orange-400" },
  L6: { name: "Create", className: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30", dot: "bg-fuchsia-400" },
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
