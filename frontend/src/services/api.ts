import axios from "axios";
import type {
  AttemptResult,
  ChatResponse,
  Document,
  Quiz,
  QuizGenerateRequest,
  QuizSummary,
} from "../types";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const api = axios.create({ baseURL });

export async function listDocuments(courseId?: number): Promise<Document[]> {
  const { data } = await api.get<Document[]>("/documents", {
    params: courseId ? { course_id: courseId } : undefined,
  });
  return data;
}

export async function uploadDocument(
  file: File,
  courseId?: number
): Promise<Document> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<Document>("/documents/upload", form, {
    params: courseId ? { course_id: courseId } : undefined,
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteDocument(id: number): Promise<void> {
  await api.delete(`/documents/${id}`);
}

export async function queryChat(
  question: string,
  courseId?: number
): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>("/chat/query", {
    question,
    course_id: courseId,
  });
  return data;
}

// ─── Quiz ────────────────────────────────────────────────────────

export async function generateQuiz(req: QuizGenerateRequest): Promise<Quiz> {
  const { data } = await api.post<Quiz>("/quiz/generate", req);
  return data;
}

export async function listQuizzes(): Promise<QuizSummary[]> {
  const { data } = await api.get<QuizSummary[]>("/quiz");
  return data;
}

export async function getQuiz(id: number): Promise<Quiz> {
  const { data } = await api.get<Quiz>(`/quiz/${id}`);
  return data;
}

export async function submitQuiz(
  id: number,
  answers: Record<number, string>,
  studentName = "Anonymous"
): Promise<AttemptResult> {
  const { data } = await api.post<AttemptResult>(`/quiz/${id}/submit`, {
    student_name: studentName,
    answers,
  });
  return data;
}

export async function deleteQuiz(id: number): Promise<void> {
  await api.delete(`/quiz/${id}`);
}

export function quizExportUrl(id: number): string {
  return `${baseURL}/quiz/${id}/export`;
}
