import { Bot, User } from "lucide-react";
import type { ChatMessage } from "../../types";
import SourceCitation from "./SourceCitation";

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-primary text-primary-fg" : "bg-primary-soft text-primary"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-primary text-primary-fg"
            : message.error
              ? "border border-destructive/20 bg-destructive-soft text-destructive"
              : "border border-border bg-surface text-foreground shadow-card"
        }`}
      >
        <p className="whitespace-pre-wrap leading-relaxed">
          {message.content}
          {message.streaming && (
            <span
              aria-hidden
              className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-current align-text-bottom"
            />
          )}
        </p>
        {!isUser && message.sources && (
          <SourceCitation sources={message.sources} />
        )}
        {!isUser && message.provider && message.provider !== "none" && (
          <div className="mt-2 text-[10px] uppercase tracking-wide text-muted">
            via {message.provider}
          </div>
        )}
      </div>
    </div>
  );
}
