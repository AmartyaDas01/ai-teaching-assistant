import { useState } from "react";
import ChatWindow from "../components/Chat/ChatWindow";
import Navbar from "../components/layout/Navbar";
import { queryChat } from "../services/api";
import type { ChatMessage } from "../types";

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSend(question: string) {
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);
    try {
      const res = await queryChat(question);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer,
          sources: res.sources,
          provider: res.provider,
        },
      ]);
    } catch (e: any) {
      const detail =
        e?.response?.data?.detail ??
        "Something went wrong reaching the backend.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: detail, error: true },
      ]);
    } finally {
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
