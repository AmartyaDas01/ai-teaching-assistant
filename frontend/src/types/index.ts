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

// ─── Quiz ────────────────────────────────────────────────────────

export type BloomLevel = "L1" | "L2" | "L3" | "L4" | "L5" | "L6";
export type Difficulty = "easy" | "medium" | "hard";

export interface QuizQuestion {
  id: number;
  question_text: string;
  options: string[];
  bloom_level: BloomLevel;
}

export interface Quiz {
  id: number;
  title: string;
  document_id: number | null;
  config: {
    num_questions?: number;
    difficulty?: Difficulty;
    bloom_levels?: BloomLevel[];
    source_filename?: string;
  };
  created_at: string;
  questions: QuizQuestion[];
}

export interface QuizSummary {
  id: number;
  title: string;
  document_id: number | null;
  num_questions: number;
  num_attempts: number;
  created_at: string;
}

export interface QuizGenerateRequest {
  document_id: number;
  num_questions: number;
  difficulty: Difficulty;
  bloom_levels: BloomLevel[];
}

export interface GradedQuestion {
  question_id: number;
  question_text: string;
  options: string[];
  your_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
  bloom_level: BloomLevel;
  explanation: string | null;
}

export interface AttemptResult {
  attempt_id: number;
  score: number;
  correct_count: number;
  total: number;
  graded: GradedQuestion[];
}
