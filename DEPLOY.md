# Deployment Guide

Three ways to run the app, from easiest to production.

---

## 1. Local (no containers) - for development

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

## 2. Docker Compose - full local stack (Postgres + backend + frontend)

Requires Docker Desktop. The LLM still runs on the **host** (Ollama) or via OpenAI.

```bash
# Optional: use OpenAI instead of local Ollama
export OPENAI_API_KEY=sk-...
# On macOS, Ollama's Metal backend may crash - force CPU:
export OLLAMA_NUM_GPU=0

docker compose up --build
```

- Frontend → http://localhost:8080
- Backend  → http://localhost:8000
- Postgres, ChromaDB, and uploads persist in named volumes.

Stop with `docker compose down` (add `-v` to wipe data).

---

## 3. Cloud - all on Render, free tier, fully persistent

Frontend (static site) + backend (Docker) both deploy from `render.yaml` in one
Blueprint. Everything runs on free plans and **nothing is lost on restart**.

> **Why OpenAI in production:** Ollama can't run on Render, so the LLM is OpenAI
> (`OPENAI_API_KEY` from platform.openai.com, billing enabled). Embeddings are
> **also** OpenAI - that's deliberate: it means the local torch model never loads, so
> the backend fits Render's free 512MB tier. Embedding cost is negligible
> (~$0.02 / 1M tokens - a fraction of a cent per document).

### A. Create the two free managed services first

Render's free tier gives no persistent disk and its free Postgres expires after ~90
days, so both stores live outside Render:

1. **Qdrant Cloud** ([cloud.qdrant.io](https://cloud.qdrant.io)) - free 1GB cluster.
   Copy the **cluster URL** and an **API key**. This holds the vectors, so they
   survive restarts.
2. **Neon** ([neon.tech](https://neon.tech)) - free, permanent Postgres. Copy the
   **connection string**. This holds users, courses, quizzes, and attempts.

### B. Deploy the Blueprint

1. Render → **New → Blueprint**, point it at this repo. It reads `render.yaml` and
   creates `ai-ta-backend` (Docker) + `ai-ta-frontend` (static site).
2. Paste the **four secrets** when prompted:
   - `OPENAI_API_KEY` - your OpenAI key
   - `QDRANT_URL` + `QDRANT_API_KEY` - from step A.1
   - `DATABASE_URL` - the Neon connection string from step A.2
3. **Apply**, then open the frontend URL.

Nothing else to wire: `VITE_API_URL` is auto-injected into the frontend build from
the backend service, and CORS already allows any `*.onrender.com` origin.

### C. Keep it warm (avoids 30-60s cold starts)

Free Render services sleep after ~15 min idle. Point a free uptime pinger at the
backend's health endpoint every ~10 minutes:

- [cron-job.org](https://cron-job.org) or [UptimeRobot](https://uptimerobot.com)
- URL: `https://<your-backend>.onrender.com/health`

### D. Verify

- Open the frontend URL, register, upload a document, chat, generate a quiz.
- Chat/quiz failing with **503** → check `OPENAI_API_KEY` on Render.
- Uploads succeed but chat finds nothing → check `QDRANT_URL` / `QDRANT_API_KEY`.
- Requests blocked by **CORS** → confirm the frontend is on an `*.onrender.com`
  domain, or set `FRONTEND_ORIGIN` to your custom domain.

> **Cost:** $0/month. The only spend is OpenAI usage (generation, plus fractions of a
> cent for embeddings).

---

## Environment variables reference

See [`.env.example`](./.env.example). Key ones for production:

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Postgres connection string (Neon in production) |
| `OPENAI_API_KEY` | Enables GPT-4o; without it the app tries Ollama |
| `LLM_PROVIDER` / `EMBEDDING_PROVIDER` | `openai` in production (embeddings too - keeps RAM low) |
| `VECTOR_STORE` | `chroma` locally (on-disk) · `qdrant` in production (remote, persistent) |
| `QDRANT_URL` / `QDRANT_API_KEY` | Qdrant Cloud cluster (only when `VECTOR_STORE=qdrant`) |
| `JWT_SECRET_KEY` | Signs auth tokens - use a strong random value |
| `FRONTEND_ORIGIN` | Extra allowed CORS origin (any `*.onrender.com` is allowed by default) |
| `UPLOAD_DIR` | Scratch dir for the file during parsing - safe to be ephemeral |
