import axios from "axios";
import type { ChatResponse, Document } from "../types";

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
