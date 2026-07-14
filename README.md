# AI Teaching Assistant

An AI-powered teaching assistant built for CSE educators. Upload an entire course's
lecture notes, PDFs and slides, then **chat with the material** (grounded answers with
source citations), **auto-generate Bloom's Taxonomy-aligned quizzes**, and **track
student performance** on a dedicated analytics dashboard.

This is not a generic "chat with your PDF" app. The design is educator-first:
retrieval spans an entire course syllabus rather than a single file, quiz generation is
pedagogically structured around Bloom's cognitive levels, and quiz results feed a real
analytics layer that surfaces which topics a cohort is struggling with.

Built by **Amartya Das** — Assistant Professor, Dept. of Computer Science &
Engineering, Dayananda Sagar University, Bangalore.

---

## Features

**📚 Course-scoped document management**
Upload PDF, DOCX, PPTX, and TXT files, organized by course. Each course maps to its own
vector collection, so retrieval naturally spans every document in a syllabus instead of
being trapped in one file.

**💬 Grounded chat with citations**
Ask a question and get an answer built strictly from your uploaded material. Every
response cites the document and page it came from, so claims are auditable. With no
course selected, retrieval fans out across all of your courses and merges the best
matches.

**📝 Bloom's Taxonomy quiz generator**
Generate MCQs from any document, with each question tagged to a Bloom's level
(L1 Remember → L6 Create). Pick the levels, difficulty, and question count; take the
quiz in-app; get scored with per-question explanations. Export as JSON.

**📊 Student performance analytics**
Scores over time, accuracy broken down by Bloom's level (to spot *which kind* of
thinking a cohort struggles with, not just "who scored low"), and a per-student
weak-area heatmap across quizzes.

**🔌 Swappable AI providers**
Chat and quiz generation run on **OpenAI GPT-4o** or a **local Ollama** model, switchable
at runtime from the Settings page — no redeploy. Embeddings are likewise either local
(`sentence-transformers`) or OpenAI. Institutions that can't send data to a third party
can run the whole thing locally.

**🔐 Multi-user auth**
JWT + bcrypt. All courses, documents, quizzes, and analytics are scoped to the
authenticated user.

---

## Tech stack

| Layer | Technology |
|---|---|
| **API** | FastAPI (Python 3.12), Pydantic v2 |
| **RAG** | LangChain · recursive chunking (500/50) · top-k cosine retrieval |
| **Vector store** | ChromaDB (local) or **Qdrant** (remote/production) — selectable |
| **Embeddings** | `all-MiniLM-L6-v2` (local, 384-d) or OpenAI `text-embedding-3-small` (1536-d) |
| **LLM** | OpenAI GPT-4o or Ollama (`llama3`) |
| **Database** | PostgreSQL (production) / SQLite (dev) via SQLAlchemy 2 |
| **Auth** | JWT (python-jose) + bcrypt |
| **Parsing** | PyMuPDF · python-docx · python-pptx |
| **Frontend** | React 18 · TypeScript · Vite · Tailwind CSS · Zustand · Recharts |
| **Deploy** | Docker · Render (Blueprint) |

---

## How the RAG pipeline works

```
Upload  ──▶  parse (PyMuPDF / docx / pptx)
        ──▶  chunk (recursive, 500 tokens / 50 overlap)
        ──▶  embed (local MiniLM  ·or·  OpenAI text-embedding-3-small)
        ──▶  store in the course's vector collection
             (metadata: doc_id, course_id, page, chunk_index)

Query   ──▶  embed the question
        ──▶  top-k cosine search across the course's collection(s)
        ──▶  build a grounded prompt from the retrieved excerpts
        ──▶  LLM answers using ONLY those excerpts
        ──▶  return the answer + source citations (document + page)
```

Quiz generation reuses the same index: it pulls broad coverage of a document's chunks,
prompts the LLM in JSON mode with explicit Bloom's-level definitions, then validates and
repairs the output before persisting.

---

## Evaluation

The RAG pipeline is measured, not assumed. [`backend/eval`](./backend/eval) runs the real
stack — same chunker, embeddings, vector store and prompt — against a labelled reference
set, scoring retrieval and generation separately (they fail differently, and one score
hides which broke).

`all-MiniLM-L6-v2` · ChromaDB · 500/50 chunking · k=5 · GPT-4o:

| Retrieval | | Generation | |
|---|---|---|---|
| hit@1 | 0.70 | correctness | 1.00 |
| hit@3 | **1.00** | groundedness | **0.90** |
| MRR | 0.83 | refusal (unanswerable) | **1.00** |
| context recall | 0.90 | | |

The reference set includes deliberately **unanswerable** questions: a teaching assistant
that won't say *"I don't know"* will eventually invent an answer for a student, so refusal
is measured explicitly. Groundedness is scored apart from correctness for the same reason —
an answer can be *right yet ungrounded*, where the model recites a fact from pre-training
that the retrieved context never supported. Exactly one question does that, and it is the
one where retrieval surfaced only half the required evidence.

```bash
cd backend && python -m eval.run_eval              # full
cd backend && python -m eval.run_eval --retrieval-only  # no LLM cost
```

## Quickstart (local)

Requires Python 3.12 and Node 18+.

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp ../.env.example ../.env      # then edit as needed (see below)

uvicorn app.main:app --reload
```

API at **http://localhost:8000** · interactive docs at **/docs**.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App at **http://localhost:5173**.

### Running with zero API keys

The defaults are fully local and free: embeddings run on `sentence-transformers`
(downloads ~90 MB once) and vectors go to on-disk ChromaDB. Upload and retrieval work
with no keys at all. To get *answers*, you need either an `OPENAI_API_KEY` in `.env`, or
a running [Ollama](https://ollama.com) (`ollama pull llama3`).

---

## Configuration

All settings live in a root `.env` (see [`.env.example`](./.env.example)).

| Variable | Purpose |
|---|---|
| `LLM_PROVIDER` | `openai` or `ollama` |
| `OPENAI_API_KEY` | Enables GPT-4o; without it the app falls back to Ollama |
| `EMBEDDING_PROVIDER` | `local` (MiniLM) or `openai` (no local model → tiny RAM footprint) |
| `VECTOR_STORE` | `chroma` (on-disk) or `qdrant` (remote, survives restarts) |
| `QDRANT_URL` / `QDRANT_API_KEY` | Qdrant Cloud cluster, when `VECTOR_STORE=qdrant` |
| `DATABASE_URL` | SQLite locally; a Postgres URL in production |
| `JWT_SECRET_KEY` | Signs auth tokens |

> Embedding providers produce different vector sizes (384 vs 1536), so a collection is
> bound to whichever created it — switching providers means re-uploading documents.

---

## Deployment

The whole app deploys from a single [`render.yaml`](./render.yaml) Blueprint — a static
frontend plus a Dockerized backend — and runs entirely on **free tiers**:

- **Render** — backend (Docker) + frontend (static site)
- **Qdrant Cloud** — vectors (free 1 GB); remote, so they survive the free tier's lack of
  a persistent disk
- **Neon** — Postgres (free, permanent)
- **OpenAI** — GPT-4o for generation and `text-embedding-3-small` for embeddings. Using
  OpenAI embeddings means no local model is loaded, which keeps the backend inside
  Render's free 512 MB memory limit.

Full walkthrough in **[DEPLOY.md](./DEPLOY.md)**, which also covers running the stack
locally with Docker Compose.

---

## Project structure

```
backend/app/
  api/routes/     auth · courses · documents · chat · quiz · analytics · settings
  services/       document ingestion · RAG pipeline · quiz generation · analytics
  vectorstore/    chroma_store · qdrant_store · shared embeddings (interchangeable)
  models/         SQLAlchemy ORM (users, courses, documents, quizzes, attempts)
  utils/          document parsers · recursive chunker

frontend/src/
  pages/          Documents · Chat · Quiz · Analytics · Settings · Login
  components/     upload · chat · quiz (Bloom's badges) · analytics charts · layout
  store/          Zustand (auth, active course)
  services/       typed API client
```
