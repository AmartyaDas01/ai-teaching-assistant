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
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <DropZone onFiles={handleFiles} disabled={uploading} />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {docs.length === 0 && !uploading && (
            <p className="text-sm text-slate-400">No documents yet.</p>
          )}
          {docs.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} />
          ))}
        </div>
      </div>
    </>
  );
}
