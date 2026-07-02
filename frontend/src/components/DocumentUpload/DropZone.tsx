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
      className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition ${
        dragging
          ? "border-brand-500 bg-brand-50"
          : "border-slate-300 bg-white hover:border-brand-400"
      } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
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
      <div className="text-3xl mb-2">📤</div>
      <p className="text-sm font-medium text-slate-700">
        {disabled ? "Uploading…" : "Drop files here or click to browse"}
      </p>
      <p className="text-xs text-slate-400 mt-1">PDF, DOCX, PPTX, or TXT</p>
    </div>
  );
}
