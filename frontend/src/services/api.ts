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
  PublicQuiz,
  QuizSummary,
  RegisterResponse,
  Source,
  User,
} from "../types";

// Render's fromService injects a bare host (no scheme); default it to https://.
// Locally VITE_API_URL is unset, so we fall back to the dev backend.
const rawApiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const baseURL = /^https?:\/\//.test(rawApiUrl) ? rawApiUrl : `https://${rawApiUrl}`;

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
): Promise<RegisterResponse> {
  const { data } = await api.post<RegisterResponse>("/auth/register", {
    name,
    email,
    password,
  });
  return data;
}

/** Exchange the emailed verification token for a session (clicking the link signs you in). */
export async function verifyEmail(token: string): Promise<AuthToken> {
  const { data } = await api.post<AuthToken>("/auth/verify", { token });
  return data;
}

export async function resendVerification(email: string): Promise<void> {
  await api.post("/auth/resend-verification", { email });
}

export interface EmailCheck {
  valid: boolean;
  detail?: string | null;
}

/**
 * Does this address actually exist? The server does a real DNS/MX lookup - the same
 * one signup performs - so a dead domain is caught while typing instead of after a
 * failed submit. It never reveals whether the address is already registered.
 */
export async function checkEmail(
  email: string,
  signal?: AbortSignal
): Promise<EmailCheck> {
  const { data } = await api.post<EmailCheck>(
    "/auth/check-email",
    { email },
    { signal }
  );
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

export interface StreamHandlers {
  onSources: (sources: Source[], provider: string) => void;
  onToken: (text: string) => void;
  onError: (detail: string) => void;
}

/**
 * Streaming chat. Uses fetch rather than axios because XHR can't expose a response
 * body incrementally in the browser - axios would only resolve once the whole answer
 * had arrived, which defeats the purpose.
 *
 * The server sends citations first, then the answer token by token.
 */
export async function streamChat(
  question: string,
  courseId: number | undefined,
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${baseURL}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ question, course_id: courseId }),
    signal,
  });

  if (!res.ok || !res.body) {
    let detail = "Something went wrong reaching the backend.";
    try {
      detail = (await res.json())?.detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    handlers.onError(detail);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line. A frame can arrive split across
    // chunks, so anything after the last separator stays buffered for next time.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const event = JSON.parse(line.slice(6));
      if (event.type === "sources") handlers.onSources(event.sources, event.provider);
      else if (event.type === "token") handlers.onToken(event.text);
      else if (event.type === "error") handlers.onError(event.detail);
    }
  }
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

// ─── Public (student) - no account, no auth header ───────────────

/** Build the link a professor hands to students. */
export function quizShareUrl(shareToken: string): string {
  return `${window.location.origin}/take/${shareToken}`;
}

export async function getSharedQuiz(shareToken: string): Promise<PublicQuiz> {
  const { data } = await api.get<PublicQuiz>(`/public/quiz/${shareToken}`);
  return data;
}

export async function submitSharedQuiz(
  shareToken: string,
  studentName: string,
  answers: Record<number, string>
): Promise<AttemptResult> {
  const { data } = await api.post<AttemptResult>(
    `/public/quiz/${shareToken}/submit`,
    { student_name: studentName, answers }
  );
  return data;
}

// ─── Analytics ───────────────────────────────────────────────────

export async function getAnalytics(): Promise<AnalyticsOverview> {
  const { data } = await api.get<AnalyticsOverview>("/analytics/overview");
  return data;
}
