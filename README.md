# AI Teaching Assistant

An AI-powered teaching assistant for CSE educators. Upload lecture notes, PDFs, and
syllabi, then chat with the content (grounded answers with source citations), auto-generate
Bloom's Taxonomy-aligned quizzes, and track student performance.

Built by **Amartya Das** — Assistant Professor, Dept. of CSE, Dayananda Sagar University.

See [`CLAUDE.md`](./CLAUDE.md) for the full project brief and architecture.

---

## Status

**Phase 1 — Core RAG** (implemented): document upload → parse → chunk → embed → ChromaDB,
and a chat endpoint that retrieves relevant chunks and answers with citations.

Later phases (quiz generator, analytics, auth, Docker, deploy) are planned — see the brief.

## Architecture (Phase 1)

- **Embeddings**: local `sentence-transformers` (`all-MiniLM-L6-v2`, 384-dim) — free,
  private, no API key. Fixed by design (switching embedding models requires re-indexing).
- **Chat LLM**: OpenAI GPT-4o when `OPENAI_API_KEY` is set, otherwise falls back to a local
  Ollama model (`llama3`). Switch with zero code changes.
- **Vector store**: ChromaDB (persistent, one collection per course).
- **DB**: SQLite for dev (Postgres-compatible SQLAlchemy models).

---

## Quickstart

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# copy env template (from repo root)
cp ../.env.example ../.env      # optional: add OPENAI_API_KEY for GPT-4o

uvicorn app.main:app --reload
```

Backend runs at http://localhost:8000 — API docs at http://localhost:8000/docs.

> **First run** downloads the local embedding model (~90 MB) once.
>
> **Chat generation** needs either an `OPENAI_API_KEY` in `.env` **or** a running
> [Ollama](https://ollama.com) (`ollama pull llama3`). Document upload and retrieval work
> with neither, since embeddings are local.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173.

---

## Usage

1. Open the frontend, go to **Documents**, and drag-drop a PDF/DOCX/PPTX/TXT.
2. Wait for status to become **ready** (parsing + embedding).
3. Go to **Chat** and ask a question — answers cite the source document and page.
