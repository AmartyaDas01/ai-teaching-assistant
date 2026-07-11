import { AlertCircle, FolderOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import DocumentCard from "../components/DocumentUpload/DocumentCard";
import DropZone from "../components/DocumentUpload/DropZone";
import Navbar from "../components/layout/Navbar";
import { UploadCard } from "@/components/ui/upload-ui";
import { deleteDocument, listDocuments, uploadDocument } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import type { Document } from "../types";

interface UploadItem {
  id: string;
  file: File;
  status: "uploading" | "success" | "error";
  progress: number;
  message?: string;
}

export default function Documents() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const controllers = useRef<Map<string, AbortController>>(new Map());
  const activeCourseId = useAppStore((s) => s.activeCourseId);

  async function refresh() {
    try {
      setDocs(await listDocuments(activeCourseId));
      setError(null);
    } catch {
      setError("Could not reach the backend. Is it running on :8000?");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCourseId]);

  function patch(id: string, changes: Partial<UploadItem>) {
    setUploads((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...changes } : u))
    );
  }

  function remove(id: string) {
    controllers.current.delete(id);
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }

  async function startUpload(item: UploadItem) {
    const controller = new AbortController();
    controllers.current.set(item.id, controller);
    patch(item.id, { status: "uploading", progress: 0, message: undefined });
    try {
      await uploadDocument(item.file, {
        courseId: activeCourseId,
        signal: controller.signal,
        onProgress: (p) => patch(item.id, { progress: p }),
      });
      patch(item.id, { status: "success", progress: 100 });
      controllers.current.delete(item.id);
      refresh();
    } catch (e: any) {
      if (e?.code === "ERR_CANCELED" || e?.name === "CanceledError") {
        remove(item.id); // user cancelled — drop the card silently
        return;
      }
      patch(item.id, {
        status: "error",
        message: e?.response?.data?.detail ?? "Upload failed. Please try again.",
      });
      controllers.current.delete(item.id);
    }
  }

  function handleFiles(files: File[]) {
    if (!activeCourseId) {
      setError(
        "Select a course in the sidebar before uploading — documents are stored per course."
      );
      return;
    }
    const items: UploadItem[] = files.map((file) => ({
      id: `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      status: "uploading",
      progress: 0,
    }));
    setUploads((prev) => [...items, ...prev]);
    items.forEach(startUpload);
  }

  function cancel(id: string) {
    controllers.current.get(id)?.abort();
    remove(id);
  }

  async function handleDelete(id: number) {
    await deleteDocument(id);
    refresh();
  }

  return (
    <>
      <Navbar
        title="Documents"
        subtitle="Upload and manage course materials"
        action={
          docs.length > 0 ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {docs.length} {docs.length === 1 ? "document" : "documents"}
            </span>
          ) : undefined
        }
      />

      <div className="scroll-slim flex-1 space-y-5 overflow-y-auto p-6">
        {!activeCourseId && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Select a course in the sidebar to upload into — documents are organized per
            course.
          </div>
        )}
        <DropZone onFiles={handleFiles} />

        {/* Live upload cards */}
        {uploads.length > 0 && (
          <div className="space-y-3">
            {uploads.map((u) => {
              if (u.status === "uploading") {
                return (
                  <UploadCard
                    key={u.id}
                    status="uploading"
                    progress={u.progress}
                    title={u.progress >= 100 ? "Processing…" : "Uploading…"}
                    description={u.file.name}
                    primaryButtonText="Cancel"
                    onPrimaryButtonClick={() => cancel(u.id)}
                    onClose={() => cancel(u.id)}
                  />
                );
              }
              if (u.status === "success") {
                return (
                  <UploadCard
                    key={u.id}
                    status="success"
                    title="Uploaded & indexed"
                    description={`${u.file.name} is ready to chat with.`}
                    primaryButtonText="Done"
                    onPrimaryButtonClick={() => remove(u.id)}
                    onClose={() => remove(u.id)}
                  />
                );
              }
              return (
                <UploadCard
                  key={u.id}
                  status="error"
                  title="Upload failed"
                  description={u.message ?? u.file.name}
                  primaryButtonText="Retry"
                  onPrimaryButtonClick={() => startUpload(u)}
                  secondaryButtonText="Dismiss"
                  onSecondaryButtonClick={() => remove(u.id)}
                  onClose={() => remove(u.id)}
                />
              );
            })}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive-soft px-4 py-2.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {docs.length === 0 && uploads.length === 0 ? (
          <div className="bg-dotted flex flex-col items-center rounded-xl border border-slate-200 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-card ring-1 ring-slate-200">
              <FolderOpen className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700">No documents yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Upload your first lecture above to start chatting with it.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {docs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
