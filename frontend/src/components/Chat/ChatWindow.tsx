import { MessagesSquare, Send } from "lucide-react";
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="mt-24 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
              <MessagesSquare className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Ask about your course materials
            </p>
            <p className="mt-1 max-w-xs text-xs text-muted">
              Answers are grounded in your uploaded documents, with source
              citations.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 pl-11 text-sm text-muted">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
            </span>
            Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border bg-surface p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Ask about your course materials…"
            className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors duration-150 placeholder:text-muted focus:border-primary"
          />
          <button
            onClick={submit}
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
