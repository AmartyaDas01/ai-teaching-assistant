import { Check, Cpu, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import Navbar from "../components/layout/Navbar";
import { getLLMSettings, setLLMSettings } from "../services/api";
import type { LLMSettings } from "../types";

type Override = "auto" | "openai" | "ollama";

const OPTIONS: { value: Override; label: string; desc: string }[] = [
  { value: "auto", label: "Auto", desc: "Use OpenAI if a key is set, else local Ollama." },
  { value: "openai", label: "OpenAI (GPT-4o)", desc: "Highest quality. Requires an API key." },
  { value: "ollama", label: "Ollama (local)", desc: "Free & private. Runs on your machine." },
];

export default function Settings() {
  const [data, setData] = useState<LLMSettings | null>(null);
  const [saving, setSaving] = useState<Override | null>(null);

  useEffect(() => {
    getLLMSettings().then(setData).catch(() => setData(null));
  }, []);

  async function choose(override: Override) {
    setSaving(override);
    try {
      setData(await setLLMSettings(override));
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <Navbar title="Settings" subtitle="Configure the AI provider" />
      <div className="scroll-slim flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-xl space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-1 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-slate-900">Language model</h2>
            </div>
            <p className="mb-4 text-xs text-slate-500">
              Choose which model powers chat answers and quiz generation. Changes
              apply immediately (embeddings stay local either way).
            </p>

            {!data ? (
              <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="space-y-2">
                {OPTIONS.map((opt) => {
                  const selected = data.override === opt.value;
                  const disabled = opt.value === "openai" && !data.openai_available;
                  return (
                    <button
                      key={opt.value}
                      disabled={disabled || saving !== null}
                      onClick={() => choose(opt.value)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                        selected
                          ? "border-primary bg-primary-soft"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200">
                        {opt.value === "ollama" ? (
                          <Cpu className="h-4 w-4 text-slate-600" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-slate-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900">
                          {opt.label}
                          {disabled && (
                            <span className="ml-2 text-xs font-normal text-slate-400">
                              (no API key)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{opt.desc}</div>
                      </div>
                      {saving === opt.value ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : selected ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}

            {data && (
              <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Active: <span className="font-semibold text-slate-700">{data.provider}</span>
                {data.provider === "ollama"
                  ? ` · ${data.ollama_model}`
                  : ` · ${data.openai_model}`}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
