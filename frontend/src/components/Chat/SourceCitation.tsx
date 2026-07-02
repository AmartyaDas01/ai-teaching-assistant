import type { Source } from "../../types";

export default function SourceCitation({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <div className="mt-3 space-y-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Sources
      </div>
      {sources.map((s, i) => (
        <details
          key={i}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs"
        >
          <summary className="cursor-pointer font-medium text-slate-600">
            {s.filename} · p.{s.page_number}
          </summary>
          <p className="mt-1 text-slate-500">{s.snippet}</p>
        </details>
      ))}
    </div>
  );
}
