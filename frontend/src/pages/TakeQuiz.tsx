import { CheckCircle2, GraduationCap, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import QuizQuestionCard from "../components/Quiz/QuizQuestion";
import { getSharedQuiz, submitSharedQuiz } from "../services/api";
import type { AttemptResult, PublicQuiz } from "../types";

type Stage = "loading" | "name" | "taking" | "done" | "error";

/**
 * Public student page (/take/<share_token>) - no account required.
 * The share token is the only credential; nothing here is behind auth.
 */
export default function TakeQuiz({ shareToken }: { shareToken: string }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [quiz, setQuiz] = useState<PublicQuiz | null>(null);
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getSharedQuiz(shareToken)
      .then((q) => {
        setQuiz(q);
        setStage("name");
      })
      .catch((e: any) => {
        setError(
          e?.response?.data?.detail ?? "This quiz link isn't valid or has been removed."
        );
        setStage("error");
      });
  }, [shareToken]);

  const answered = quiz ? quiz.questions.filter((q) => answers[q.id]).length : 0;
  const allAnswered = quiz ? answered === quiz.questions.length : false;

  async function submit() {
    if (!allAnswered) return;
    setSubmitting(true);
    try {
      setResult(await submitSharedQuiz(shareToken, name.trim(), answers));
      setStage("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Couldn't submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#050505]">
      <header className="border-b border-white/10 bg-[#0a0a0c]/70 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-slate-100">
            {quiz?.title ?? "Quiz"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        {stage === "loading" && (
          <div className="flex items-center justify-center gap-2 py-24 text-muted">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading quiz…
          </div>
        )}

        {stage === "error" && (
          <div className="rounded-2xl border border-white/10 bg-surface p-8 text-center shadow-card">
            <XCircle className="mx-auto mb-4 h-10 w-10 text-rose-400" />
            <h1 className="text-lg font-bold text-slate-100">Quiz unavailable</h1>
            <p className="mt-1 text-sm text-muted">{error}</p>
          </div>
        )}

        {/* Ask who's taking it - this is what makes the professor's analytics meaningful. */}
        {stage === "name" && quiz && (
          <div className="rounded-2xl border border-white/10 bg-surface p-6 shadow-card">
            <h1 className="text-base font-bold text-slate-100">{quiz.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {quiz.questions.length} questions · your answers are shared with your
              instructor.
            </p>
            <label className="label-mono mt-5 block text-[11px] text-slate-400">
              Your name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && setStage("taking")}
              placeholder="e.g. Riya Sharma"
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none focus:border-white/40"
            />
            <button
              disabled={!name.trim()}
              onClick={() => setStage("taking")}
              className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              Start quiz
            </button>
          </div>
        )}

        {stage === "taking" && quiz && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-100">{name}</span>
              <span className="text-xs text-muted">
                {answered} / {quiz.questions.length} answered
              </span>
            </div>

            {quiz.questions.map((q, i) => (
              <QuizQuestionCard
                key={q.id}
                index={i + 1}
                questionText={q.question_text}
                options={q.options}
                bloomLevel={q.bloom_level}
                selected={answers[q.id]}
                onSelect={(opt) => setAnswers((p) => ({ ...p, [q.id]: opt }))}
              />
            ))}

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive-soft px-4 py-2.5 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={!allAnswered || submitting}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-all hover:bg-primary-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Submitting…"
                : allAnswered
                  ? "Submit answers"
                  : `Answer all questions (${answered}/${quiz.questions.length})`}
            </button>
          </div>
        )}

        {/* Students see their score and the explanations - the quiz doubles as feedback. */}
        {stage === "done" && result && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-surface p-6 text-center shadow-card">
              <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-emerald-400" />
              <div className="label-mono text-xs text-slate-500">Your score</div>
              <div
                className={`mt-1 text-4xl font-extrabold ${
                  result.score >= 80
                    ? "text-emerald-400"
                    : result.score >= 50
                      ? "text-amber-400"
                      : "text-rose-400"
                }`}
              >
                {result.score}%
              </div>
              <div className="mt-1 text-sm text-muted">
                {result.correct_count} of {result.total} correct · submitted as {name}
              </div>
            </div>

            {result.graded.map((g, i) => (
              <QuizQuestionCard
                key={g.question_id}
                index={i + 1}
                questionText={g.question_text}
                options={g.options}
                bloomLevel={g.bloom_level}
                graded={g}
              />
            ))}

            <p className="pb-6 text-center text-xs text-slate-500">
              Your result has been recorded for your instructor.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
