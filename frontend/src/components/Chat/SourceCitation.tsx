import { FileText } from "lucide-react";
import type { Source } from "../../types";

export default function SourceCitation({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <div className="mt-3 space-y-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        Sources
      </div>
      {sources.map((s, i) => (
        <details
          key={i}
          className="rounded-lg border border-border bg-slate-50 px-3 py-1.5 text-xs"
        >
          <summary className="flex cursor-pointer items-center gap-1.5 font-medium text-foreground/80">
            <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
            {s.filename} · p.{s.page_number}
          </summary>
          <p className="mt-1 pl-5 text-muted">{s.snippet}</p>
        </details>
      ))}
    </div>
  );
}
