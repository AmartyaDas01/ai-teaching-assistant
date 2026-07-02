"""Split extracted page text into overlapping chunks for embedding.

Uses LangChain's RecursiveCharacterTextSplitter with the brief's settings
(chunk_size=500, chunk_overlap=50). chunk_size is measured in characters here; a token-
based length function can be swapped in later if needed. Each chunk carries page_number
and a document-wide chunk_index for citation metadata.
"""
from dataclasses import dataclass

from langchain_text_splitters import RecursiveCharacterTextSplitter

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50


@dataclass
class Chunk:
    text: str
    page_number: int
    chunk_index: int


_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def chunk_pages(pages: list[tuple[int, str]]) -> list[Chunk]:
    """Turn [(page_number, text), ...] into a flat, indexed list of Chunks."""
    chunks: list[Chunk] = []
    idx = 0
    for page_number, text in pages:
        for piece in _splitter.split_text(text):
            piece = piece.strip()
            if not piece:
                continue
            chunks.append(Chunk(text=piece, page_number=page_number, chunk_index=idx))
            idx += 1
    return chunks
