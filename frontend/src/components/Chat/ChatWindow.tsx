import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../../types";
import MessageBubble from "./MessageBubble";

interface ChatWindowProps {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (question: string) => void;
}

export default function ChatWindow({ messages, loading, onSend }: ChatWindowProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function submit() {
    const q = input.trim();
    if (!q || loading) return;
    onSend(q);
    setInput("");
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="mt-20 text-center text-sm text-slate-400">
            Ask a question about your uploaded course materials.
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {loading && (
          <div className="text-sm text-slate-400">Thinking…</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 bg-white p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Ask about your course materials…"
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-brand-500"
          />
          <button
            onClick={submit}
            disabled={loading || !input.trim()}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
