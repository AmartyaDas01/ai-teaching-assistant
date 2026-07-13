import { Loader2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPT = ".pdf,.docx,.pptx,.txt";

export default function DropZone({ onFiles, disabled }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === " ") &&
        !disabled &&
        inputRef.current?.click()
      }
      className={`group flex cursor-pointer items-center gap-4 rounded-xl border border-dashed p-5 transition-all duration-150 ${
        dragging
          ? "border-white/60 bg-white/[0.06] ring-4 ring-white/10"
          : "border-white/15 bg-surface hover:border-white/35 hover:bg-white/5"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors ${
          dragging
            ? "bg-primary text-primary-fg"
            : "bg-white/10 text-foreground group-hover:bg-primary group-hover:text-primary-fg"
        }`}
      >
        {disabled ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <UploadCloud className="h-5 w-5" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-100">
          {disabled ? "Uploading…" : "Upload course materials"}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          Drag &amp; drop or click — PDF, DOCX, PPTX, TXT
        </p>
      </div>
    </div>
  );
}
