"""
ingestion/chunker.py
─────────────────────
Structure-aware Markdown chunking via LangChain's MarkdownHeaderTextSplitter.

Why this beats fixed-size chunking
------------------------------------
Fixed-size chunking cuts blindly through sentences and paragraphs, producing
chunks that are semantically incomplete and lack document context.
MarkdownHeaderTextSplitter splits *on document structure* (headings), so each
chunk corresponds to a logical section — a paragraph under a heading, a table,
a bullet list — preserving the meaning the author intended.

The extracted header hierarchy (H1 → H2 → H3) is stored in
``structural_metadata`` on each chunk and is also *prepended to the chunk
text* so that embedding models and the LLM receive the full navigational
context even when chunks are retrieved in isolation.
"""

from __future__ import annotations

try:
    from langchain_text_splitters import MarkdownHeaderTextSplitter
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        "langchain-text-splitters is not installed. "
        "Run: pip install langchain-text-splitters"
    ) from exc


# The header levels LangChain will split on, in order of precedence.
_HEADERS_TO_SPLIT_ON: list[tuple[str, str]] = [
    ("#",   "Header 1"),
    ("##",  "Header 2"),
    ("###", "Header 3"),
]


def _build_header_prefix(metadata: dict[str, str]) -> str:
    """
    Convert LangChain's header metadata dict into a readable prefix string.

    Example
    -------
    Input:  {"Header 1": "Introduction", "Header 2": "Background"}
    Output: "[Header 1: Introduction | Header 2: Background]"
    """
    if not metadata:
        return ""
    parts = [f"{k}: {v}" for k, v in metadata.items() if v]
    return f"[{' | '.join(parts)}]" if parts else ""


def chunk_text(markdown_text: str) -> list[dict]:
    """
    Split a Markdown document into structure-aware chunks.

    Each chunk aligns with a logical document section determined by Markdown
    headers (H1, H2, H3).  Structural context is preserved by:

    1. Storing the header hierarchy in ``structural_metadata``.
    2. Prepending a human-readable header prefix to ``text`` so encoders and
       the LLM always see *where* in the document a passage came from.

    Parameters
    ----------
    markdown_text : str
        Full Markdown string returned by ``parse_file()``.

    Returns
    -------
    list[dict]
        A list of chunk dictionaries, each with keys:

        ``text``
            Header-prefixed chunk content fed to embedding models and the LLM.
        ``chunk_index``
            Zero-based position of this chunk in the document.
        ``structural_metadata``
            Dict of extracted headers, e.g.
            ``{"Header 1": "Methods", "Header 2": "Dataset"}``.
    """
    if not markdown_text or not markdown_text.strip():
        return []

    splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=_HEADERS_TO_SPLIT_ON,
        strip_headers=True,   # header lines are captured in metadata, not body
    )

    raw_docs = splitter.split_text(markdown_text)

    chunks: list[dict] = []
    for idx, doc in enumerate(raw_docs):
        content: str = doc.page_content.strip()
        if not content:
            continue

        structural_metadata: dict[str, str] = {
            k: v for k, v in (doc.metadata or {}).items() if v
        }

        prefix = _build_header_prefix(structural_metadata)
        enriched_text = f"{prefix}\n{content}" if prefix else content

        chunks.append({
            "text":               enriched_text,
            "chunk_index":        idx,
            "structural_metadata": structural_metadata,
        })

    return chunks
