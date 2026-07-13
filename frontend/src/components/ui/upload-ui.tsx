// src/components/ui/upload-ui.tsx
"use client";

import clsx from "clsx";
import { ArrowDownCircle, CheckCircle, Loader2, X, XCircle } from "lucide-react";
import * as React from "react";

interface UploadCardProps {
  status: "uploading" | "success" | "error";
  progress?: number; // Only relevant for 'uploading' status
  title: string;
  description: string;
  primaryButtonText: string;
  onPrimaryButtonClick?: () => void;
  secondaryButtonText?: string;
  onSecondaryButtonClick?: () => void;
  onClose?: () => void;
}

const STATUS_STYLES = {
  uploading: {
    Icon: ArrowDownCircle,
    ring: "ring-white/15",
    tile: "bg-white/10 text-foreground",
    bar: "bg-primary",
  },
  success: {
    Icon: CheckCircle,
    ring: "ring-emerald-500/25",
    tile: "bg-emerald-500/10 text-emerald-400",
    bar: "bg-emerald-500",
  },
  error: {
    Icon: XCircle,
    ring: "ring-rose-500/25",
    tile: "bg-rose-500/10 text-rose-400",
    bar: "bg-rose-500",
  },
} as const;

export const UploadCard: React.FC<UploadCardProps> = ({
  status,
  progress = 0,
  title,
  description,
  primaryButtonText,
  onPrimaryButtonClick,
  secondaryButtonText,
  onSecondaryButtonClick,
  onClose,
}) => {
  const s = STATUS_STYLES[status];
  const uploading = status === "uploading";

  return (
    <div
      className={clsx(
        "relative rounded-xl border border-white/10 bg-surface p-4 shadow-card ring-1 ring-inset",
        s.ring
      )}
    >
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="absolute right-3 top-3 rounded-md p-1 text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex items-start gap-3 pr-6">
        <div
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            s.tile
          )}
        >
          {uploading && progress >= 100 ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <s.Icon className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <p className="mt-0.5 truncate text-xs text-muted">{description}</p>

          {uploading && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-muted">
                <span>{progress >= 100 ? "Processing…" : "Uploading"}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={clsx("h-full rounded-full transition-all duration-200", s.bar)}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <div className="mt-3">
                <button
                  onClick={onPrimaryButtonClick}
                  className="text-xs font-semibold text-muted transition-colors hover:text-slate-200"
                >
                  {primaryButtonText}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(status === "success" || status === "error") && (
        <div className="mt-3 flex items-center gap-2 pl-[52px]">
          <button
            onClick={onPrimaryButtonClick}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
          >
            {primaryButtonText}
          </button>
          {secondaryButtonText && (
            <button
              onClick={onSecondaryButtonClick}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
            >
              {secondaryButtonText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
