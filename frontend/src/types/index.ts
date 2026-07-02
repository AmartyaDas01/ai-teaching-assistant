export interface Document {
  id: number;
  course_id: number;
  filename: string;
  file_type: string;
  status: "processing" | "ready" | "failed";
  page_count: number;
  chunk_count: number;
  error: string | null;
  uploaded_at: string;
}

export interface Source {
  doc_id: number;
  filename: string;
  page_number: number;
  snippet: string;
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
  provider: "openai" | "ollama" | "none";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  provider?: string;
  error?: boolean;
}
