# RAG evaluation

A RAG system that is never measured is a system nobody knows is working. This harness
runs the **real** pipeline — the same chunker, embedding provider, vector store and
prompt the app uses — against a labelled reference set, so a change to chunk size, the
embedding model, or `k` can be judged by numbers instead of vibes.

```bash
cd backend
python -m eval.run_eval                  # full run (retrieval + LLM-judged generation)
python -m eval.run_eval --retrieval-only # no LLM calls, no API cost — used in CI
python -m eval.run_eval --k 3            # sweep retrieval depth
```

## What is measured, and why

Retrieval and generation fail in different ways, and a single end-to-end score hides
which one broke. They are therefore scored separately.

**Retrieval**

| Metric | Question it answers |
|---|---|
| `hit@k` | Did *any* retrieved chunk contain evidence the answer needs? |
| `MRR` | How highly was the first relevant chunk ranked? |
| `context recall` | What share of the required evidence actually reached the prompt? |

A low `hit@k` means the retriever never found the evidence — no amount of prompt
engineering will fix that. High `hit@k` with low `context recall` means the answer was
assembled from partial evidence.

**Generation** (LLM-judged)

| Metric | Question it answers |
|---|---|
| `correctness` | Does the answer agree with the reference answer? |
| `groundedness` | Is every claim supported by the retrieved context — or invented? |
| `refusal` | On questions the document *cannot* answer, does the system decline? |

`groundedness` is the one that matters most here. An answer can be **correct and still
ungrounded**: the model knows the fact from pre-training and states it even though the
retrieved context never supported it. For a teaching assistant that is a real failure —
the whole promise is that answers come from *your* material. The reference set includes
deliberately **unanswerable** questions to measure refusal, because a system that will
not say "I don't know" will eventually make something up to a student.

## Methodology notes

**Relevance is matched on evidence phrases, not chunk ids.** Chunk boundaries move
whenever the chunker is retuned, so id-based labels rot silently. Evidence phrases
survive that.

**A chunk counts as relevant if it contains *any* required evidence.** Requiring *all*
of it in a single chunk was the first thing I tried and it is wrong: a comparison
question ("quicksort vs merge sort") draws its evidence from two different sections,
which by construction land in different chunks. That rule scored a *perfect* retrieval
as a miss — it was measuring chunk boundaries, not the retriever. Whether the full
evidence was assembled is measured separately, by context recall over the union of
retrieved chunks.

**The eval writes to a throwaway vector store**, never the developer's Chroma directory
or a live Qdrant cluster, so runs are reproducible and side-effect free.

## Baseline

`all-MiniLM-L6-v2` embeddings · ChromaDB · 500/50 chunking · k=5 · GPT-4o

| Retrieval | | Generation | |
|---|---|---|---|
| hit@1 | 0.70 | correctness | 1.00 |
| hit@3 | 1.00 | groundedness | 0.90 |
| hit@5 | 1.00 | refusal | 1.00 |
| MRR | 0.83 | | |
| context recall | 0.90 | | |

Reading this: retrieval reliably finds the evidence by rank 3, but only 70% of the time
at rank 1 — so a reranker would be the highest-value next change. The single
groundedness failure is instructive: that question had only 0.50 context recall, and the
model quietly filled the gap from its own knowledge. It was *right*, which is precisely
why the failure would have gone unnoticed without this metric.
