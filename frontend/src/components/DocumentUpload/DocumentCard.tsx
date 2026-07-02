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
    label: "ready",
    className: "bg-accent-soft text-accent",
    Icon: CheckCircle2,
  },
  processing: {
    label: "processing",
    className: "bg-amber-100 text-amber-700",
    Icon: Loader2,
  },
  failed: {
    label: "failed",
    className: "bg-destructive-soft text-destructive",
    Icon: XCircle,
  },
};

interface DocumentCardProps {
  doc: Document;
  onDelete: (id: number) => void;
}

export default function DocumentCard({ doc, onDelete }: DocumentCardProps) {
  const status = STATUS[doc.status];
  return (
    <div className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-card transition-shadow duration-150 hover:shadow-card-hover">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <FileText className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">
          {doc.filename}
        </div>
        <div className="truncate text-xs text-muted">
          {doc.status === "ready"
            ? `${doc.page_count} pages · ${doc.chunk_count} chunks`
            : doc.error ?? doc.file_type.toUpperCase()}
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
        className="rounded-lg p-2 text-muted opacity-0 transition-all duration-150 hover:bg-destructive-soft hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
        title="Delete document"
        aria-label={`Delete ${doc.filename}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
