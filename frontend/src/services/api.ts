import axios from "axios";
import type {
  AnalyticsOverview,
  AttemptResult,
  AuthToken,
  ChatResponse,
  Course,
  Document,
  LLMSettings,
  Quiz,
  QuizGenerateRequest,
  QuizSummary,
  User,
} from "../types";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const api = axios.create({ baseURL });

// ─── Auth token wiring ───────────────────────────────────────────
let authToken: string | null = localStorage.getItem("ata_token");

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (token) localStorage.setItem("ata_token", token);
  else localStorage.removeItem("ata_token");
}

api.interceptors.request.use((config) => {
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    // On expired/invalid session, drop the token and let the app show login.
    if (error?.response?.status === 401) {
      setAuthToken(null);
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────

export async function register(
  name: string,
  email: string,
  password: string
): Promise<AuthToken> {
  const { data } = await api.post<AuthToken>("/auth/register", {
    name,
    email,
    password,
  });
  return data;
}

export async function login(email: string, password: string): Promise<AuthToken> {
  const { data } = await api.post<AuthToken>("/auth/login", { email, password });
  return data;
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

// ─── Courses ─────────────────────────────────────────────────────

export async function listCourses(): Promise<Course[]> {
  const { data } = await api.get<Course[]>("/courses");
  return data;
}

export async function createCourse(
  name: string,
  semester?: string
): Promise<Course> {
  const { data } = await api.post<Course>("/courses", { name, semester });
  return data;
}

export async function deleteCourse(id: number): Promise<void> {
  await api.delete(`/courses/${id}`);
}

// ─── Settings ────────────────────────────────────────────────────

export async function getLLMSettings(): Promise<LLMSettings> {
  const { data } = await api.get<LLMSettings>("/settings/llm");
  return data;
}

export async function setLLMSettings(
  override: "auto" | "openai" | "ollama"
): Promise<LLMSettings> {
  const { data } = await api.put<LLMSettings>("/settings/llm", { override });
  return data;
}

// ─── Documents ───────────────────────────────────────────────────

export async function listDocuments(courseId?: number): Promise<Document[]> {
  const { data } = await api.get<Document[]>("/documents", {
    params: courseId ? { course_id: courseId } : undefined,
  });
  return data;
}

export interface UploadOptions {
  courseId?: number;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export async function uploadDocument(
  file: File,
  opts: UploadOptions = {}
): Promise<Document> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<Document>("/documents/upload", form, {
    params: opts.courseId ? { course_id: opts.courseId } : undefined,
    headers: { "Content-Type": "multipart/form-data" },
    signal: opts.signal,
    onUploadProgress: (e) => {
      if (opts.onProgress && e.total) {
        opts.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
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

// ─── Analytics ───────────────────────────────────────────────────

export async function getAnalytics(): Promise<AnalyticsOverview> {
  const { data } = await api.get<AnalyticsOverview>("/analytics/overview");
  return data;
}
