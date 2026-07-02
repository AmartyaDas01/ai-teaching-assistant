import type { ChatMessage } from "../../types";
import SourceCitation from "./SourceCitation";

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-brand-600 text-white"
            : message.error
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-white text-slate-800 border border-slate-200"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!isUser && message.sources && (
          <SourceCitation sources={message.sources} />
        )}
        {!isUser && message.provider && message.provider !== "none" && (
          <div className="mt-2 text-[10px] uppercase tracking-wide text-slate-400">
            via {message.provider}
          </div>
        )}
      </div>
    </div>
  );
}
