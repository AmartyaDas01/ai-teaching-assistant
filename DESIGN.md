# Design Notes

Architecture and design decisions behind the AI Teaching Assistant. For what the
project *is* and how to run it, see [README.md](./README.md); for deployment, see
[DEPLOY.md](./DEPLOY.md).

---

## Design goal

Most "chat with your PDF" tools are single-document, general-purpose, and pedagogically
inert. This project is built around three things a teacher actually needs:

1. **Retrieval across a whole syllabus**, not one file. Vector collections are scoped to
   a *course*, so a question can pull evidence from any lecture in it.
2. **Assessment that maps to cognitive levels.** Quizzes are generated against Bloom's
   Taxonomy (L1–L6), because "can they recall it" and "can they apply it" are different
   questions and should be measured separately.
3. **Analytics that answer "what should I reteach?"** — accuracy broken down by Bloom's
   level and by topic, not just a leaderboard of scores.

---

## RAG pipeline

```
Ingestion
  parse      PyMuPDF (PDF) · python-docx · python-pptx · plain text
  chunk      RecursiveCharacterTextSplitter, 500 tokens / 50 overlap
  embed      MiniLM (384-d, local) or OpenAI text-embedding-3-small (1536-d)
  store      one vector collection per course
             metadata: doc_id, course_id, page_number, chunk_index

Query
  embed      the question, with the same model
  retrieve   top-k (k=5) cosine matches from the course's collection(s)
  prompt     system prompt + numbered excerpts + question
  generate   LLM answers using ONLY the excerpts
  cite       return the answer plus each source's document + page
```

**Chunking (500/50) is a deliberate trade-off.** Too large and retrieved context is
mostly irrelevant filler that dilutes the prompt; too small and a single concept gets
split across chunks so neither one retrieves well. 500 tokens holds roughly a full idea,
and the 50-token overlap stops a definition from being cut in half at a boundary.

**One collection per course, not per document.** This is what makes cross-document
questions work naturally: "compare the two sorting algorithms we covered" can hit chunks
from different lectures. When no course is selected, retrieval fans out across every
collection the user owns and merges the globally closest matches — cosine distance is
comparable across collections because they share an embedding model.

**Citations are non-negotiable.** Because `doc_id` and `page_number` are stored as vector
metadata, every answer can point at its evidence. An ungrounded teaching assistant is
worse than none: a confidently wrong answer to a student is a real cost.

---

## Quiz generation

```
select     a document + Bloom's levels + difficulty + question count
retrieve   broad coverage of that document's chunks (not similarity — coverage)
prompt     LLM in JSON mode, with explicit definitions of each Bloom's level
validate   parse JSON (tolerating fences/prose), check option counts, match the
           stated answer back to an actual option, normalize the Bloom's level
persist    quiz + questions -> Postgres
```

The model is given **explicit definitions** of each Bloom's level rather than just the
label, because "L4" alone produces inconsistent tagging. Output is validated and
repaired rather than trusted: questions whose answer doesn't match one of their own
options are dropped instead of being stored as unanswerable.

Scoring compares submitted answers to the stored correct option and records an attempt,
which is what the analytics layer aggregates.

---

## Data model

```sql
users         (id, name, email, password_hash, role, created_at)
courses       (id, user_id, name, semester, created_at)
documents     (id, course_id, filename, file_type, filepath,
               collection_id, status, page_count, chunk_count, uploaded_at)
quizzes       (id, document_id, course_id, title, config_json, created_at)
questions     (id, quiz_id, question_text, options_json, correct_answer,
               bloom_level, explanation)
quiz_attempts (id, quiz_id, student_name, answers_json, score, attempted_at)
```

`Course` is the hub of the model: it owns the documents, and its id derives the name of
the vector collection (`course_{id}`). That makes it the single join between the
relational world (who owns what) and the vector world (where the embeddings live) — so
ownership checks and retrieval scope stay consistent with each other.

---

## Pluggable providers

Three independent switches, all environment-driven, so the same code runs from a laptop
with no API keys to a cloud deployment:

| Switch | Options | Why it matters |
|---|---|---|
| `LLM_PROVIDER` | OpenAI GPT-4o · local Ollama | Institutions that can't send student data to a third party can run entirely offline. Also switchable at runtime from the Settings page. |
| `EMBEDDING_PROVIDER` | local MiniLM · OpenAI | The local model needs ~1 GB RAM; the API needs none. This is what lets the backend fit a free 512 MB host. |
| `VECTOR_STORE` | ChromaDB (on-disk) · Qdrant (remote) | On-disk is simplest locally; remote survives hosts that have no persistent disk. |

The LLM is built behind a `get_llm()` factory and the vector store behind a common
interface, so swapping either is configuration, not a code change.

**Caveat:** embedding providers produce different vector dimensions (384 vs 1536), so a
collection is bound to whichever model created it. Switching providers requires
re-ingesting documents — there is no safe way to mix them in one index.

---

## Notable implementation decisions

- **Synchronous ingestion.** Parsing + embedding a large PDF takes ~10–30s. A task queue
  (Celery/Redis) would move this off the request path; it's deliberately deferred, since
  for single-professor use the added infrastructure costs more than it buys.
- **Explicit course selection on upload and chat.** An earlier version silently fell back
  to the user's oldest course when none was selected, which quietly routed documents into
  the wrong vector collection and made them unfindable. Ambiguity is now an error, not a
  guess.
- **Qdrant payload index.** Filtering by `doc_id` requires an index on a real Qdrant
  server (the in-memory client doesn't enforce it), so the index is created with the
  collection.
- **Graceful provider fallbacks.** A missing OpenAI key falls back to Ollama rather than
  crashing, which keeps local development zero-configuration.
