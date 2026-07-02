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
    className: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
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
  pdf: "from-rose-500/15 to-rose-500/5 text-rose-600",
  docx: "from-sky-500/15 to-sky-500/5 text-sky-600",
  pptx: "from-orange-500/15 to-orange-500/5 text-orange-600",
  txt: "from-slate-500/15 to-slate-500/5 text-slate-600",
};

interface DocumentCardProps {
  doc: Document;
  onDelete: (id: number) => void;
}

export default function DocumentCard({ doc, onDelete }: DocumentCardProps) {
  const status = STATUS[doc.status];
  const tint = TYPE_TINT[doc.file_type] ?? TYPE_TINT.txt;

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3.5 transition-all duration-150 hover:border-slate-300 hover:shadow-card-hover">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${tint}`}
      >
        <FileText className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-900">
          {doc.filename}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium uppercase text-slate-400">
            {doc.file_type}
          </span>
          {doc.status === "ready" && (
            <>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>
                {doc.page_count} pages · {doc.chunk_count} chunks
              </span>
            </>
          )}
          {doc.status === "failed" && doc.error && (
            <>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="truncate text-destructive">{doc.error}</span>
            </>
          )}
        </div>
      </div>

      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
      >
        <status.Icon
          className={`h-3.5 w-3.5 ${doc.status === "processing" ? "animate-spin" : ""}`}
        />
        {status.label}
      </span>

      <button
        onClick={() => onDelete(doc.id)}
        className="rounded-lg p-2 text-slate-400 opacity-0 transition-all duration-150 hover:bg-destructive-soft hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
        title="Delete document"
        aria-label={`Delete ${doc.filename}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
