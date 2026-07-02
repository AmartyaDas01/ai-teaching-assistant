import { AlertCircle, FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import DocumentCard from "../components/DocumentUpload/DocumentCard";
import DropZone from "../components/DocumentUpload/DropZone";
import Navbar from "../components/layout/Navbar";
import { deleteDocument, listDocuments, uploadDocument } from "../services/api";
import type { Document } from "../types";

export default function Documents() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setDocs(await listDocuments());
    } catch {
      setError("Could not reach the backend. Is it running on :8000?");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleFiles(files: File[]) {
    setUploading(true);
    setError(null);
    for (const file of files) {
      try {
        await uploadDocument(file);
      } catch (e: any) {
        setError(e?.response?.data?.detail ?? `Failed to upload ${file.name}`);
      }
    }
    setUploading(false);
    refresh();
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
        <DropZone onFiles={handleFiles} disabled={uploading} />

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive-soft px-4 py-2.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {docs.length === 0 && !uploading ? (
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
