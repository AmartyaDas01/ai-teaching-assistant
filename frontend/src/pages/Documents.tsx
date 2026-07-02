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
      <Navbar title="Documents" subtitle="Upload and manage course materials" />
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <DropZone onFiles={handleFiles} disabled={uploading} />

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive-soft px-4 py-2.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {docs.length === 0 && !uploading ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border py-12 text-center">
            <FolderOpen className="mb-2 h-8 w-8 text-muted" />
            <p className="text-sm text-muted">
              No documents yet — upload your first lecture above.
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
