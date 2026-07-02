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
      className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-10 text-center transition-colors duration-150 ${
        dragging
          ? "border-primary bg-primary-soft"
          : "border-border bg-surface hover:border-primary/60 hover:bg-slate-50"
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
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        {disabled ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <UploadCloud className="h-6 w-6" />
        )}
      </div>
      <p className="text-sm font-semibold text-foreground">
        {disabled ? "Uploading…" : "Drop files here or click to browse"}
      </p>
      <p className="mt-1 text-xs text-muted">PDF, DOCX, PPTX, or TXT</p>
    </div>
  );
}
