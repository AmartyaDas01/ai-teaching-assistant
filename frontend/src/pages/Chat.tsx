import { useState } from "react";
import ChatWindow from "../components/Chat/ChatWindow";
import Navbar from "../components/layout/Navbar";
import { streamChat } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import type { ChatMessage } from "../types";

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const activeCourseId = useAppStore((s) => s.activeCourseId);

  async function handleSend(question: string) {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      // The assistant's bubble is created empty and filled as tokens arrive.
      { role: "assistant", content: "", sources: [], streaming: true },
    ]);
    setLoading(true);

    // Mutate only the final message — it is the one being streamed into.
    const patchLast = (change: (m: ChatMessage) => ChatMessage) =>
      setMessages((prev) =>
        prev.map((m, i) => (i === prev.length - 1 ? change(m) : m))
      );

    try {
      await streamChat(question, activeCourseId, {
        // Citations arrive before the prose, so the reader sees the material being
        // used before the answer itself.
        onSources: (sources, provider) =>
          patchLast((m) => ({ ...m, sources, provider })),
        onToken: (text) =>
          patchLast((m) => ({ ...m, content: m.content + text })),
        onError: (detail) =>
          patchLast((m) => ({ ...m, content: detail, error: true, sources: [] })),
      });
    } catch {
      patchLast((m) => ({
        ...m,
        content: "Something went wrong reaching the backend.",
        error: true,
      }));
    } finally {
      patchLast((m) => ({ ...m, streaming: false }));
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar title="Chat" subtitle="Grounded answers from your documents" />
      <ChatWindow messages={messages} loading={loading} onSend={handleSend} />
    </>
  );
}
