# Deployment Guide

Three ways to run the app, from easiest to production.

---

## 1. Local (no containers) — for development

```bash
# LLM
open -a Ollama                      # or set OPENAI_API_KEY in .env

# Backend
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload

# Frontend
cd frontend && npm run dev
```

App → http://localhost:5173

---

## 2. Docker Compose — full local stack (Postgres + backend + frontend)

Requires Docker Desktop. The LLM still runs on the **host** (Ollama) or via OpenAI.

```bash
# Optional: use OpenAI instead of local Ollama
export OPENAI_API_KEY=sk-...
# On macOS, Ollama's Metal backend may crash — force CPU:
export OLLAMA_NUM_GPU=0

docker compose up --build
```

- Frontend → http://localhost:8080
- Backend  → http://localhost:8000
- Postgres, ChromaDB, and uploads persist in named volumes.

Stop with `docker compose down` (add `-v` to wipe data).

---

## 3. Cloud — Vercel (frontend) + Render (backend)

> **Important:** Ollama can't run on Render, so production uses **OpenAI**. You'll
> need an `OPENAI_API_KEY` from platform.openai.com (billing enabled). Embeddings
> stay local inside the container — no extra cost there.

### A. Backend on Render

1. Push this repo to GitHub (already done).
2. In Render → **New → Blueprint**, point it at this repo. It reads `render.yaml`
   and provisions the web service + a Postgres database.
3. Set the secret env var when prompted:
   - `OPENAI_API_KEY` = your key
4. After the first deploy, copy the backend URL (e.g. `https://ai-ta-backend.onrender.com`).
5. Update `FRONTEND_ORIGIN` (in Render env) to your Vercel URL once you have it (step B),
   then redeploy so CORS allows the frontend.

> First build is slow (installs torch/sentence-transformers). Use at least the
> **starter** plan — the free tier lacks the RAM for the embedding model.

### B. Frontend on Vercel

1. In Vercel → **Add New → Project**, import this repo.
2. Set **Root Directory** to `frontend`. Vercel auto-detects Vite (`vercel.json` is included).
3. Add an environment variable:
   - `VITE_API_URL` = your Render backend URL (from step A.4)
4. Deploy. Vercel gives you a public URL.
5. Put that URL into Render's `FRONTEND_ORIGIN` (step A.5) and redeploy the backend.

### C. Verify

- Open the Vercel URL, register an account, upload a document, chat, generate a quiz.
- If chat/quiz fail with a 503, check `OPENAI_API_KEY` on Render.
- If requests are blocked by CORS, confirm `FRONTEND_ORIGIN` matches the Vercel domain.

---

## Environment variables reference

See [`.env.example`](./.env.example). Key ones for production:

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Postgres connection string (Render provides this) |
| `OPENAI_API_KEY` | Enables GPT-4o; without it the app tries Ollama |
| `JWT_SECRET_KEY` | Signs auth tokens — use a strong random value |
| `FRONTEND_ORIGIN` | Allowed CORS origin (your Vercel domain) |
| `CHROMA_PERSIST_DIR` / `UPLOAD_DIR` | Point at the mounted disk (`/data/...`) |
