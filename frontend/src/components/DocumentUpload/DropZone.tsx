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
          ? "border-primary bg-primary-soft/60 ring-4 ring-primary/10"
          : "border-slate-300 bg-white hover:border-primary/50 hover:bg-slate-50"
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
            ? "bg-primary text-white"
            : "bg-primary-soft text-primary group-hover:bg-primary group-hover:text-white"
        }`}
      >
        {disabled ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <UploadCloud className="h-5 w-5" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">
          {disabled ? "Uploading…" : "Upload course materials"}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          Drag &amp; drop or click — PDF, DOCX, PPTX, TXT
        </p>
      </div>
    </div>
  );
}
