import type { Document } from "../../types";

const STATUS_STYLES: Record<Document["status"], string> = {
  ready: "bg-green-100 text-green-700",
  processing: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
};

const TYPE_ICONS: Record<string, string> = {
  pdf: "📕",
  docx: "📘",
  pptx: "📙",
  txt: "📄",
};

interface DocumentCardProps {
  doc: Document;
  onDelete: (id: number) => void;
}

export default function DocumentCard({ doc, onDelete }: DocumentCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-2xl">{TYPE_ICONS[doc.file_type] ?? "📄"}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-slate-800">{doc.filename}</div>
        <div className="text-xs text-slate-400">
          {doc.status === "ready"
            ? `${doc.page_count} pages · ${doc.chunk_count} chunks`
            : doc.error ?? doc.file_type.toUpperCase()}
        </div>
      </div>
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[doc.status]}`}
      >
        {doc.status}
      </span>
      <button
        onClick={() => onDelete(doc.id)}
        className="text-slate-400 hover:text-red-600 text-sm"
        title="Delete document"
      >
        ✕
      </button>
    </div>
  );
}
