import {
  CheckCircle2,
  FileText,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";
import type { Document } from "../../types";

const STATUS: Record<
  Document["status"],
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  ready: {
    label: "Ready",
    className: "bg-accent-soft text-accent ring-1 ring-inset ring-accent/20",
    Icon: CheckCircle2,
  },
  processing: {
    label: "Processing",
    className: "bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/25",
    Icon: Loader2,
  },
  failed: {
    label: "Failed",
    className:
      "bg-destructive-soft text-destructive ring-1 ring-inset ring-destructive/20",
    Icon: XCircle,
  },
};

// Subtle per-type accent on the file tile
const TYPE_TINT: Record<string, string> = {
  pdf: "from-rose-500/20 to-rose-500/5 text-rose-400",
  docx: "from-sky-500/20 to-sky-500/5 text-sky-400",
  pptx: "from-orange-500/20 to-orange-500/5 text-orange-400",
  txt: "from-slate-400/20 to-slate-400/5 text-slate-300",
};

interface DocumentCardProps {
  doc: Document;
  onDelete: (id: number) => void;
}

export default function DocumentCard({ doc, onDelete }: DocumentCardProps) {
  const status = STATUS[doc.status];
  const tint = TYPE_TINT[doc.file_type] ?? TYPE_TINT.txt;

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-white/10 bg-surface p-3.5 transition-all duration-150 hover:border-white/20 hover:shadow-card-hover">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${tint}`}
      >
        <FileText className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-100">
          {doc.filename}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
          <span className="label-mono font-medium text-slate-500">
            {doc.file_type}
          </span>
          {doc.status === "ready" && (
            <>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>
                {doc.page_count} pages · {doc.chunk_count} chunks
              </span>
            </>
          )}
          {doc.status === "failed" && doc.error && (
            <>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span className="truncate text-destructive">{doc.error}</span>
            </>
          )}
        </div>
      </div>

      <span
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium `}
      >
        <status.Icon
          className={`h-3.5 w-3.5 ${doc.status === "processing" ? "animate-spin" : ""}`}
        />
        {status.label}
      </span>

      <button
        onClick={() => onDelete(doc.id)}
        className="rounded-lg p-2 text-slate-400 opacity-100 transition-all duration-150 hover:bg-destructive-soft hover:text-destructive focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
        title="Delete document"
        aria-label={`Delete ${doc.filename}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
