import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { listDocuments } from "../../services/api";
import { useAppStore } from "../../store/useAppStore";
import type {
  BloomLevel,
  Difficulty,
  Document,
  QuizGenerateRequest,
} from "../../types";
import { BLOOM_META } from "./BloomsBadge";

const ALL_LEVELS: BloomLevel[] = ["L1", "L2", "L3", "L4", "L5", "L6"];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

interface QuizConfigProps {
  onGenerate: (req: QuizGenerateRequest) => void;
  generating: boolean;
}

export default function QuizConfig({ onGenerate, generating }: QuizConfigProps) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [documentId, setDocumentId] = useState<number | null>(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [levels, setLevels] = useState<BloomLevel[]>(["L1", "L2", "L3"]);
  const activeCourseId = useAppStore((s) => s.activeCourseId);

  useEffect(() => {
    listDocuments(activeCourseId).then((d) => {
      const ready = d.filter((x) => x.status === "ready");
      setDocs(ready);
      setDocumentId(ready.length ? ready[0].id : null);
    });
  }, [activeCourseId]);

  function toggleLevel(l: BloomLevel) {
    setLevels((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]
    );
  }

  const canGenerate =
    documentId !== null && levels.length > 0 && !generating;

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <h2 className="text-base font-bold text-slate-900">Generate a quiz</h2>
      <p className="mt-0.5 text-sm text-slate-500">
        Auto-create Bloom's Taxonomy-aligned MCQs from a document.
      </p>

      {docs.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No ready documents. Upload one on the Documents page first.
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {/* Document */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Source document
            </label>
            <select
              value={documentId ?? ""}
              onChange={(e) => setDocumentId(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.filename}
                </option>
              ))}
            </select>
          </div>

          {/* Count + difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Questions: {numQuestions}
              </label>
              <input
                type="range"
                min={1}
                max={15}
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-full accent-[color:var(--color-primary)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Difficulty
              </label>
              <div className="flex overflow-hidden rounded-lg border border-slate-300">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 px-2 py-2 text-xs font-medium capitalize transition-colors ${
                      difficulty === d
                        ? "bg-primary text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bloom's levels */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Bloom's levels
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_LEVELS.map((l) => {
                const active = levels.includes(l);
                const meta = BLOOM_META[l];
                return (
                  <button
                    key={l}
                    onClick={() => toggleLevel(l)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-all ${
                      active
                        ? `${meta.className} ring-inset`
                        : "bg-white text-slate-400 ring-slate-200 hover:text-slate-600"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${active ? meta.dot : "bg-slate-300"}`}
                    />
                    {l} · {meta.name}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() =>
              documentId !== null &&
              onGenerate({
                document_id: documentId,
                num_questions: numQuestions,
                difficulty,
                bloom_levels: levels,
              })
            }
            disabled={!canGenerate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating… (local model, ~30s)
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate quiz
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
