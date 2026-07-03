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
    correct: "border-emerald-400 bg-emerald-50 text-emerald-900",
    wrong: "border-rose-300 bg-rose-50 text-rose-900",
    chosen: "border-primary bg-primary-soft text-slate-900",
    idle: "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">
          <span className="mr-2 text-slate-400">Q{index}.</span>
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
              {state === "correct" && <Check className="h-4 w-4 text-emerald-600" />}
              {state === "wrong" && <X className="h-4 w-4 text-rose-500" />}
            </button>
          );
        })}
      </div>

      {reviewing && graded!.explanation && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">Why: </span>
          {graded!.explanation}
        </p>
      )}
    </div>
  );
}
