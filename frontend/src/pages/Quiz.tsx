import { AlertCircle, Download, RotateCcw } from "lucide-react";
import { useState } from "react";
import QuizConfig from "../components/Quiz/QuizConfig";
import QuizQuestion from "../components/Quiz/QuizQuestion";
import Navbar from "../components/layout/Navbar";
import {
  generateQuiz,
  quizExportUrl,
  submitQuiz,
} from "../services/api";
import type { AttemptResult, Quiz as QuizType, QuizGenerateRequest } from "../types";

type Mode = "config" | "taking" | "review";

export default function Quiz() {
  const [mode, setMode] = useState<Mode>("config");
  const [quiz, setQuiz] = useState<QuizType | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(req: QuizGenerateRequest) {
    setGenerating(true);
    setError(null);
    try {
      const q = await generateQuiz(req);
      setQuiz(q);
      setAnswers({});
      setResult(null);
      setMode("taking");
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ?? "Failed to generate quiz. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit() {
    if (!quiz) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitQuiz(quiz.id, answers);
      setResult(res);
      setMode("review");
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to submit quiz.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setMode("config");
    setQuiz(null);
    setAnswers({});
    setResult(null);
    setError(null);
  }

  const answeredCount = quiz
    ? quiz.questions.filter((q) => answers[q.id]).length
    : 0;
  const allAnswered = quiz ? answeredCount === quiz.questions.length : false;

  return (
    <>
      <Navbar
        title="Quiz Generator"
        subtitle="Bloom's Taxonomy-aligned questions from your documents"
        action={
          mode !== "config" ? (
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New quiz
            </button>
          ) : undefined
        }
      />

      <div className="scroll-slim flex-1 overflow-y-auto p-4 sm:p-6">
        {error && (
          <div className="mx-auto mb-4 flex max-w-2xl items-center gap-2 rounded-lg border border-destructive/20 bg-destructive-soft px-4 py-2.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {mode === "config" && (
          <QuizConfig onGenerate={handleGenerate} generating={generating} />
        )}

        {mode === "taking" && quiz && (
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-100">{quiz.title}</h2>
              <span className="text-xs text-muted">
                {answeredCount} / {quiz.questions.length} answered
              </span>
            </div>
            {quiz.questions.map((q, i) => (
              <QuizQuestion
                key={q.id}
                index={i + 1}
                questionText={q.question_text}
                options={q.options}
                bloomLevel={q.bloom_level}
                selected={answers[q.id]}
                onSelect={(opt) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                }
              />
            ))}
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-all hover:bg-primary-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Scoring…"
                : allAnswered
                  ? "Submit answers"
                  : `Answer all questions (${answeredCount}/${quiz.questions.length})`}
            </button>
          </div>
        )}

        {mode === "review" && quiz && result && (
          <div className="mx-auto max-w-2xl space-y-4">
            <ScoreCard result={result} quizId={quiz.id} />
            {result.graded.map((g, i) => (
              <QuizQuestion
                key={g.question_id}
                index={i + 1}
                questionText={g.question_text}
                options={g.options}
                bloomLevel={g.bloom_level}
                graded={g}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ScoreCard({ result, quizId }: { result: AttemptResult; quizId: number }) {
  const pct = result.score;
  const tone =
    pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-rose-400";
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-surface p-5 shadow-card sm:p-6">
      <div>
        <div className="label-mono text-xs font-semibold text-slate-500">
          Your score
        </div>
        <div className={`mt-1 text-4xl font-extrabold ${tone}`}>{pct}%</div>
        <div className="mt-1 text-sm text-muted">
          {result.correct_count} of {result.total} correct
        </div>
      </div>
      <a
        href={quizExportUrl(quizId)}
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-surface-2 px-3.5 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5"
      >
        <Download className="h-4 w-4" />
        Export JSON
      </a>
    </div>
  );
}
