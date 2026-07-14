"""Measure the RAG pipeline instead of assuming it works.

Runs the *real* stack — the same chunker, embedding provider, vector store and prompt
the app uses — against a labelled reference set, and reports:

  Retrieval
    hit@k   did any retrieved chunk actually contain the evidence the answer needs?
    MRR     how highly was the first relevant chunk ranked?

  Generation (needs an LLM; skip with --retrieval-only)
    correctness   does the answer agree with the reference answer?
    groundedness  is every claim supported by the retrieved context, or invented?
    refusal       on questions the document cannot answer, does it decline?

Why these: retrieval and generation fail differently, and a single "does it look right"
score hides which one broke. A low hit@k means the retriever never found the evidence —
no prompt engineering will fix that. High hit@k with low groundedness means the model is
ignoring the context it was given.

Usage
  python -m eval.run_eval                  # full run (uses the configured LLM)
  python -m eval.run_eval --retrieval-only # no LLM calls, no API cost — fine for CI
  python -m eval.run_eval --k 3
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import re
import sys
import tempfile
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))  # import the app package

DATASET = HERE / "dataset"


def _isolate_stores() -> None:
    """Point the vector store at a throwaway location.

    The eval must never write into the developer's real Chroma directory or a live
    Qdrant cluster, and it must be reproducible run to run.
    """
    tmp = tempfile.mkdtemp(prefix="rag_eval_")
    os.environ["CHROMA_PERSIST_DIR"] = f"{tmp}/chroma"
    os.environ["UPLOAD_DIR"] = f"{tmp}/uploads"
    os.environ.setdefault("VECTOR_STORE", "chroma")


_isolate_stores()

from app.config import settings  # noqa: E402
from app.services import rag_service  # noqa: E402
from app.utils.chunker import chunk_pages  # noqa: E402
from app.vectorstore import store  # noqa: E402

COLLECTION = "rag_eval"

JUDGE_PROMPT = """You are grading a question-answering system that must answer ONLY from \
the provided context.

Question: {question}
Reference answer: {reference}
Context given to the system:
\"\"\"{context}\"\"\"
System's answer: {answer}

Score two things independently:

"correct": 1 if the system's answer agrees with the reference answer on the substance \
(wording may differ), else 0.
"grounded": 1 if every factual claim in the system's answer is supported by the context \
above, else 0. An answer that is correct but states facts absent from the context is NOT \
grounded.

Return ONLY JSON: {{"correct": 0 or 1, "grounded": 0 or 1, "why": "one short sentence"}}"""

REFUSAL_PROMPT = """A question-answering system must answer ONLY from provided course \
material, and must refuse when the material does not contain the answer.

Question: {question}
System's answer: {answer}

Did the system correctly refuse / say it lacks the information, rather than attempting \
a factual answer?

Return ONLY JSON: {{"refused": 0 or 1}}"""


def ingest() -> int:
    """Push the reference document through the app's real ingestion path."""
    spec = json.loads((DATASET / "golden.json").read_text())
    text = (DATASET / spec["document"]).read_text()
    chunks = chunk_pages([(1, text)])
    store.delete_collection(COLLECTION)
    store.add_chunks(
        collection_name=COLLECTION,
        doc_id=1,
        course_id=1,
        filename=spec["document"],
        chunks=chunks,
    )
    return len(chunks)


def _normalize(s: str) -> str:
    return re.sub(r"\s+", " ", s).lower()


def chunk_is_relevant(chunk_text: str, evidence: list[str]) -> bool:
    """A chunk is relevant if it carries ANY of the evidence the answer depends on.

    Requiring *all* evidence in a single chunk was the obvious first definition and it
    is wrong: a comparison question ("quicksort vs merge sort") draws evidence from two
    different sections, which by construction land in different chunks. That rule scored
    a perfect retrieval as a miss — it measured chunk boundaries, not the retriever.
    Whether the full evidence was assembled is measured separately, by context recall
    over the union of retrieved chunks.

    Matching on evidence strings rather than labelled chunk ids is also deliberate:
    chunk boundaries shift whenever the chunker is retuned, so id-based labels rot.
    """
    body = _normalize(chunk_text)
    return any(_normalize(e) in body for e in evidence)


def context_recall(retrieved: list[dict], evidence: list[str]) -> float:
    """Fraction of the required evidence present anywhere in the retrieved context.

    This is what actually determines whether the LLM *could* answer: it does not care
    which chunk a fact came from, only that the fact reached the prompt at all.
    """
    if not evidence:
        return 1.0
    body = _normalize(" ".join(c["text"] for c in retrieved))
    found = sum(1 for e in evidence if _normalize(e) in body)
    return found / len(evidence)


def _judge(llm, prompt: str) -> dict:
    raw = llm.invoke(prompt)
    content = raw.content if hasattr(raw, "content") else str(raw)
    match = re.search(r"\{.*\}", content, re.DOTALL)
    return json.loads(match.group(0)) if match else {}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--k", type=int, default=5, help="retrieval depth (default 5)")
    ap.add_argument(
        "--retrieval-only",
        action="store_true",
        help="skip LLM judging — no API cost, safe for CI",
    )
    args = ap.parse_args()

    spec = json.loads((DATASET / "golden.json").read_text())
    questions = spec["questions"]

    n_chunks = ingest()
    print(f"\nRAG evaluation — {spec['document']}")
    print(
        f"  embeddings: {settings.embedding_provider} · vector store: "
        f"{settings.vector_store} · chunks: {n_chunks} · k={args.k}"
    )
    if not args.retrieval_only:
        print(f"  judge/answer LLM: {rag_service.active_provider()}")
    print()

    answerable = [q for q in questions if not q.get("unanswerable")]
    unanswerable = [q for q in questions if q.get("unanswerable")]

    hits = {1: 0, 3: 0, args.k: 0}
    reciprocal_ranks: list[float] = []
    recalls: list[float] = []
    correct = grounded = judged = 0
    refused = 0
    rows: list[tuple] = []
    llm = None if args.retrieval_only else rag_service.get_llm(json_mode=True)

    t0 = time.time()
    for q in answerable:
        retrieved = store.similarity_search(COLLECTION, q["question"], k=args.k)
        ranks = [
            i + 1
            for i, c in enumerate(retrieved)
            if chunk_is_relevant(c["text"], q["evidence"])
        ]
        first = ranks[0] if ranks else None
        for k in hits:
            if first is not None and first <= k:
                hits[k] += 1
        reciprocal_ranks.append(1.0 / first if first else 0.0)
        recall = context_recall(retrieved, q["evidence"])
        recalls.append(recall)

        row_correct = row_grounded = "-"
        if not args.retrieval_only:
            context = "\n\n".join(c["text"] for c in retrieved)
            answer = rag_service.answer_query(q["question"], [COLLECTION]).answer
            verdict = _judge(
                llm,
                JUDGE_PROMPT.format(
                    question=q["question"],
                    reference=q["reference_answer"],
                    context=context,
                    answer=answer,
                ),
            )
            judged += 1
            correct += int(verdict.get("correct", 0))
            grounded += int(verdict.get("grounded", 0))
            row_correct = "✓" if verdict.get("correct") else "✗"
            row_grounded = "✓" if verdict.get("grounded") else "✗"

        rows.append(
            (q["id"], q["bloom"], first or "—", f"{recall:.2f}", row_correct, row_grounded)
        )

    # Refusal: a grounded system must decline when the document cannot answer.
    for q in unanswerable:
        if args.retrieval_only:
            rows.append((q["id"], q["bloom"], "n/a", "n/a", "-", "-"))
            continue
        answer = rag_service.answer_query(q["question"], [COLLECTION]).answer
        verdict = _judge(llm, REFUSAL_PROMPT.format(question=q["question"], answer=answer))
        ok = int(verdict.get("refused", 0))
        refused += ok
        rows.append(
            (q["id"], q["bloom"], "n/a", "n/a", "✓" if ok else "✗", "(refusal)")
        )

    elapsed = time.time() - t0
    n = len(answerable)

    print(f"  {'id':<5} {'bloom':<6} {'rank':<6} {'recall':<8} {'correct':<9} grounded")
    print("  " + "-" * 52)
    for r in rows:
        print(f"  {r[0]:<5} {r[1]:<6} {str(r[2]):<6} {str(r[3]):<8} {r[4]:<9} {r[5]}")

    print("\n  Retrieval")
    print(f"    hit@1          {hits[1] / n:.2f}  ({hits[1]}/{n})")
    print(f"    hit@3          {hits[3] / n:.2f}  ({hits[3]}/{n})")
    print(f"    hit@{args.k}          {hits[args.k] / n:.2f}  ({hits[args.k]}/{n})")
    print(f"    MRR            {sum(reciprocal_ranks) / n:.2f}")
    print(
        f"    context recall {sum(recalls) / n:.2f}   "
        f"[share of required evidence that reached the prompt]"
    )

    if not args.retrieval_only:
        print("\n  Generation")
        print(f"    correctness  {correct / judged:.2f}  ({correct}/{judged})")
        print(f"    groundedness {grounded / judged:.2f}  ({grounded}/{judged})")
        print(
            f"    refusal      {refused / len(unanswerable):.2f}  "
            f"({refused}/{len(unanswerable)})   [unanswerable questions]"
        )

    print(f"\n  {elapsed:.1f}s\n")
    store.delete_collection(COLLECTION)

    # Non-zero exit if retrieval collapses — makes this usable as a CI gate.
    return 0 if hits[args.k] / n >= 0.7 else 1


if __name__ == "__main__":
    raise SystemExit(main())
