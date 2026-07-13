import { CornerDownLeft, MessagesSquare, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../../types";
import MessageBubble from "./MessageBubble";

interface ChatWindowProps {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (question: string) => void;
}

const EXAMPLES = [
  "Summarize the key concepts in this lecture",
  "What are the main topics covered?",
  "Explain this with a simple example",
];

export default function ChatWindow({ messages, loading, onSend }: ChatWindowProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function submit(text?: string) {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    onSend(q);
    setInput("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scroll-slim flex-1 space-y-5 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="mx-auto mt-20 flex max-w-md flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-black shadow-lg shadow-white/10 ring-1 ring-white/20">
              <MessagesSquare className="h-7 w-7" />
            </div>
            <h2 className="text-base font-bold text-slate-100">
              Chat with your course materials
            </h2>
            <p className="mt-1 text-sm text-muted">
              Every answer is grounded in your uploaded documents, with source
              citations.
            </p>
            <div className="mt-5 flex w-full flex-col gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => submit(ex)}
                  className="rounded-lg border border-white/10 bg-surface px-4 py-2.5 text-left text-sm text-slate-300 transition-all duration-150 hover:border-white/30 hover:bg-white/5 hover:text-slate-100"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}

        {loading && (
          <div className="flex items-center gap-2 pl-11 text-sm text-muted">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500" />
            </span>
            Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/10 bg-[#0a0a0c]/70 p-4 backdrop-blur">
        <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-surface p-1.5 shadow-card transition-colors focus-within:border-white/40">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Ask about your course materials…"
            className="flex-1 bg-transparent px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-slate-500"
          />
          <button
            onClick={() => submit()}
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-fg transition-all duration-150 hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-muted">
          Press
          <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-sans">
            <CornerDownLeft className="inline h-3 w-3" />
          </kbd>
          to send
        </div>
      </div>
    </div>
  );
}
