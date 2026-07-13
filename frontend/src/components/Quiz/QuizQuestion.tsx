import { Check, X } from "lucide-react";
import type { BloomLevel, GradedQuestion } from "../../types";
import BloomsBadge from "./BloomsBadge";

interface QuizQuestionProps {
  index: number;
  questionText: string;
  options: string[];
  bloomLevel: BloomLevel;
  selected?: string;
  onSelect?: (option: string) => void;
  // Review mode: when provided, renders correctness + explanation
  graded?: GradedQuestion;
}

export default function QuizQuestion({
  index,
  questionText,
  options,
  bloomLevel,
  selected,
  onSelect,
  graded,
}: QuizQuestionProps) {
  const reviewing = !!graded;

  function optionState(opt: string): "correct" | "wrong" | "chosen" | "idle" {
    if (reviewing) {
      if (opt === graded!.correct_answer) return "correct";
      if (opt === graded!.your_answer) return "wrong";
      return "idle";
    }
    return opt === selected ? "chosen" : "idle";
  }

  const stateClasses: Record<string, string> = {
    correct: "border-emerald-500/50 bg-emerald-500/10 text-emerald-200",
    wrong: "border-rose-500/50 bg-rose-500/10 text-rose-200",
    chosen: "border-white/50 bg-white/[0.06] text-slate-100",
    idle: "border-white/10 bg-surface-2 text-slate-300 hover:border-white/25",
  };

  return (
    <div className="rounded-xl border border-white/10 bg-surface p-5 shadow-card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-100">
          <span className="mr-2 text-slate-500">Q{index}.</span>
          {questionText}
        </h3>
        <BloomsBadge level={bloomLevel} showName={false} className="shrink-0" />
      </div>

      <div className="space-y-2">
        {options.map((opt) => {
          const state = optionState(opt);
          return (
            <button
              key={opt}
              disabled={reviewing}
              onClick={() => onSelect?.(opt)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-all ${stateClasses[state]} ${reviewing ? "cursor-default" : ""}`}
            >
              <span>{opt}</span>
              {state === "correct" && <Check className="h-4 w-4 text-emerald-400" />}
              {state === "wrong" && <X className="h-4 w-4 text-rose-400" />}
            </button>
          );
        })}
      </div>

      {reviewing && graded!.explanation && (
        <p className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
          <span className="font-semibold text-slate-200">Why: </span>
          {graded!.explanation}
        </p>
      )}
    </div>
  );
}
