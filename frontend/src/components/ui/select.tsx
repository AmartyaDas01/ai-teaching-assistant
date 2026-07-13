import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  size?: "sm" | "md";
}

/**
 * Themed, keyboard-accessible dropdown that replaces the native <select> so the
 * open popup matches the dark theme (native option lists are OS-drawn and can't be
 * fully styled). Values are strings; callers map to/from their own types.
 */
export default function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  ariaLabel,
  size = "md",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // On open, start the highlight on the current selection.
  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value);
    setHighlight(idx >= 0 ? idx : 0);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the highlighted option in view during keyboard navigation.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  function commit(idx: number) {
    const opt = options[idx];
    if (opt) {
      onChange(opt.value);
      setOpen(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        setOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setHighlight(0);
        break;
      case "End":
        e.preventDefault();
        setHighlight(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(highlight);
        break;
    }
  }

  const sizeCls = size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-surface-2 ${sizeCls} text-left outline-none transition-colors hover:border-white/25 ${
          open ? "border-white/40" : "border-white/10"
        }`}
      >
        <span className={`truncate ${selected ? "text-slate-100" : "text-slate-500"}`}>
          {selected ? selected.label : placeholder}
          {selected?.hint ? (
            <span className="text-slate-500"> · {selected.hint}</span>
          ) : null}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          className="scroll-slim absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-lg border border-white/10 bg-surface p-1 shadow-card-hover"
        >
          {options.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted">No options</li>
          )}
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isHighlight = i === highlight;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => commit(i)}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-1.5 ${sizeCls} ${
                  isHighlight ? "bg-white/[0.07]" : ""
                } ${isSelected ? "text-slate-100" : "text-slate-300"}`}
              >
                <span className="truncate">
                  {opt.label}
                  {opt.hint ? (
                    <span className="text-slate-500"> · {opt.hint}</span>
                  ) : null}
                </span>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
